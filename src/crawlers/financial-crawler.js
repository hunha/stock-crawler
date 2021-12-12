const path = require('path');
const tesseract = require("node-tesseract-ocr")
const fs = require('fs');
const pdf2pic = require('pdf2pic');
const objectUtils = require('../common/object-utils');
const stockUtils = require('../common/stock-utils');
const pathUtils = require('../common/path-util');
const ocrUtils = require('../common/ocr-utils');
const financialStatementModel = require('../models/financial_statement');
const stockModel = require('../models/stock');
const balanceSheetModel = require('../models/balance_sheet');
const cashFlowStatementModel = require('../models/cash_flow_statement')
const incomeStatementModel = require('../models/income_statement');

const PAGE_TO_START = 5;
const PAGE_TO_END = 17;
const DEFAULT_STATEMENT_TYPE = 'YEARLY';

const crawlFromImages = async (source) => {
    const stocks = fs.readdirSync(source).map(name => { return { code: name, path: path.join(source, name) }; });
    for (var i = 0; i < stocks.length; i++) {
        console.log('--process on stock', stocks[i].code);

        const stock = await stockModel.getBySymbol(stocks[i].code);
        if (!stock) {
            continue;
        }

        await crawlStockSheets(stock, stocks[i].path);
    }

    console.log('--Financial crawling END');
}

const crawlStockSheets = async (stock, stockFolder) => {
    await prepareImageData(stockFolder);

    const years = fs.readdirSync(stockFolder).map(name => { return { code: name, path: path.join(stockFolder, name) }; }).filter(y => !pathUtils.isFile(y.code));

    for (var j = 0; j < years.length; j++) {
        const year = years[j];

        const time = process.hrtime();

        const sheetCode = stockUtils.composeFinancialStatementCode(stock.code, DEFAULT_STATEMENT_TYPE, year.code, year.code);

        const statement = await financialStatementModel.getByCode(sheetCode);
        if (!statement) {
            const yearResult = await readYearlySheet(year.path);

            const sheet = objectUtils.entriesToObject(yearResult, 'code', 'amount');
            sheet.year = year.code;
            sheet.code = sheetCode;

            await createStockSheet(stock, sheet);
        }

        const diff = process.hrtime(time);
        console.log(`--processed on year ${year.code} in ${diff[0]} seconds`);
    }
}

const prepareImageData = async (stockFolder) => {
    const years = fs.readdirSync(stockFolder).map(name => { return { code: name, path: path.join(stockFolder, name) }; });

    var missingYears = getMissingImagesYear(years);

    for (var i = 0; i < missingYears.length; i++) {
        const year = pathUtils.getName(missingYears[i].code);
        const yearFolder = path.join(stockFolder, year);

        await prepareYearImages(missingYears[i].path, year, yearFolder);
    }
}

const getMissingImagesYear = (years) => {
    var folders = years.filter(y => !pathUtils.isFile(y.code)).map(y => y.code);
    return years.filter(y => pathUtils.isFile(y.code)).filter(y => !folders.includes(pathUtils.getName(y.code)));
}

const prepareYearImages = async (filePath, year, saveFolder) => {
    fs.mkdirSync(saveFolder);

    await convertPdfToImage(filePath, year, saveFolder, PAGE_TO_START, PAGE_TO_END);
}

const convertPdfToImage = async (filePath, fileName, savePath, startPage, endPage) => {
    const storeAsImage = pdf2pic.fromPath(filePath, {
        density: 200,
        quality: 200,
        saveFilename: fileName,
        savePath: savePath,
        format: "jpg",
        width: 1654,
        height: 2339
    });

    for (var page = startPage; page <= endPage; page++) {
        await storeAsImage(page);
    }
}

const readYearlySheet = async (imageSource) => {
    var fieldsToFind = Array.from(FIELDS);
    var lastResults = [];

    const files = fs.readdirSync(imageSource).map(name => path.join(imageSource, name)).filter(name => name.indexOf('.jpg') > 0).sort((a, b) => {
        if (a.length < b.length) return -1;
        else if (a.length > b.length) return 1;
        else return a - b;
    });

    for (var i = 0; i < files.length; i++) {
        console.log('--process on', files[i]);

        const text = await ocrUtils.recognize(files[i], 'vie');

        const results = findInText(text.replace(/\r\n/g, "\n"), fieldsToFind);

        lastResults = lastResults.concat(results);

        const foundFieldCodes = results.map(r => r.code);
        fieldsToFind = fieldsToFind.filter(f => !foundFieldCodes.includes(f.code));
    }

    return lastResults;
}

const findInText = (text, fields) => {
    const results = [];

    for (var i = 0; i < fields.length; i++) {
        if (!!fields[i].ignorePatterns) {
            var shouldIgnoreField;

            for (var j = 0; j < fields[i].ignorePatterns.length; j++) {
                const shouldIgnore = fields[i].ignorePatterns[j].test(text);
                if (shouldIgnore) {
                    shouldIgnoreField = true;
                }
            }

            if (shouldIgnoreField) continue;
        }

        var fieldFounds;

        for (var j = 0; j < fields[i].regexPatterns.length; j++) {
            fieldFounds = text.match(fields[i].regexPatterns[j]);
            if (!!fieldFounds) break;
        }

        if (!!fieldFounds) {
            const amount = extractAmount(fieldFounds[0]);
            if (amount != 0) {
                results.push({
                    code: fields[i].code,
                    amount: extractAmount(fieldFounds[0])
                });
            }
        }
    }

    return results;
}

const extractAmount = (text) => {
    var amountFounds = text.match(/\(?(\d+(\.|\,)){2,}\d+\)?/g);
    if (!!amountFounds) {
        const isNegative = amountFounds[0].indexOf('(') > -1;
        var amount = amountFounds[0];

        if (amountFounds[0].indexOf(",") > 0) {
            amount = amountFounds[0].substring(0, amountFounds[0].indexOf(","));
        }

        amount = amount.replaceAll('.', '').replace('(', '').replace(')', '');
        return isNegative ? -amount : amount;
    }

    return 0;
}

const createStockSheet = async (stock, sheet) => {
    console.log('--create statement', sheet.code);

    await financialStatementModel.create({
        code: sheet.code,
        stock: stock.code,
        statement_type: DEFAULT_STATEMENT_TYPE,
        statement_year: sheet.year,
        indicate: sheet.year
    });

    await balanceSheetModel.create({
        code: sheet.code,
        currentAssets: sheet.currentAssets,
        cashEquivalents: sheet.cashEquivalents,
        shortTermInvestments: sheet.shortTermInvestments,
        currentReceivables: sheet.currentReceivables,
        inventories: sheet.inventories,
        otherCurrentAssets: sheet.otherCurrentAssets,
        longTermAssets: sheet.longTermAssets,
        longTermReceivables: sheet.longTermReceivables,
        tangibleAssets: sheet.tangibleAssets,
        intangibleAssets: sheet.intangibleAssets,
        goodwill: sheet.goodwill,
        totalAssets: sheet.totalAssets,
        currentLiabilities: sheet.currentLiabilities,
        longTermDebt: sheet.longTermDebt,
        totalLiabilities: sheet.totalLiabilities,
        noncontrollingInterests: sheet.noncontrollingInterests,
        stockTreasury: sheet.stockTreasury,
        preferredShares: sheet.preferredShares
    });

    await cashFlowStatementModel.create({
        code: sheet.code,
        cashFromOperations: sheet.cashFromOperations,
        cashFromInvesting: sheet.cashFromInvesting,
        cashFromFinancing: sheet.cashFromFinancing
    });

    await incomeStatementModel.create({
        code: sheet.code,
        totalRevenue: sheet.totalRevenue,
        incomeBeforeTax: sheet.incomeBeforeTax,
        netIncome: sheet.netIncome
    });
}

const FIELDS = [
    {
        code: 'currentAssets',
        regexPatterns: [/(TÀI|TẢI)(\s?)(SẢN|SÁN|SÂN|SÀN|SẲN|SẢẲN|SẴẲN|SẴN|SẮN)(\s?)(NGẮN|NGÁN|NGẮÁN|NGÂN|NGẢN|NGẮẢN|NGÀN)(\s?)HẠN(\s?).+/g]
    },
    {
        code: 'cashEquivalents',
        regexPatterns: [
            /(Tiền|Tiễn|Tiển)(\s?)và(\s?)các(\n?.*)(\n?.*)(khoản|khoan|khoăn|khoắn|khoán|khoän)(\n?.*)(\n?.*)tương(\n?.*)(\n?.*)(đương|đượơng|đượng)(\n?.*)(\n?.*)(tiền|tiên)(\s?).+/g,
            /(Tiền|Tiên|Tiển)(\s?).+/g
        ]
    },
    {
        code: 'totalLiabilities',
        regexPatterns: [/NỢ(\s?)(PHẢI|PHÁI|PHẢÁI)(\s?)(TRẢ|TRÀ|TRÀẢ|TRA|TRÁ|TRẢÁ)(\s?).+/g]
    },
    {
        code: 'shortTermInvestments',
        regexPatterns: [
            /(Đầu|Dầu)(\s?)tư(\s?)(tài|lài)(\s?)(chính|chjnh)(\s?)(ngắn|ngẩn|ngẫn)(\s?)hạn(\s?).+/g,
            /Các(\s?)(khoản|khoan|khoăn|khoắn|khoán|khoän)(\s?)đầu(\s?)tư(\s?)(tài|lài)(\s?)(chính|chjnh)(\s?)(ngắn|ngẩn|ngẫn)(\s?)hạn(\s?).+/g,
            /Các(\s?)(khoản|khoan|khoăn|khoắn|khoán|khoän)(\s?)đầu(\s?)tư(\s?)(ngắn|ngẩn|ngẫn)(\s?)hạn(\s?).+/g
        ]
    },
    {
        code: 'currentReceivables',
        regexPatterns: [/(Các|Cắc)(\s?)(khoản|khoan|khoăn|khoắn|khoán|khoän)(\s?)(phải|phảị|phái)(\s?)(thu|thư)(\s?)(ngắn|ngẫn|ngẳn|ugẳn)(\s?)hạn(\s?).+/g]
    },
    {
        code: 'inventories',
        regexPatterns: [/(Hàng|Hãng)(\s?)(tồn|tnn|tổn)(\s?)kho(\s?).+/g]
    },
    {
        code: 'otherCurrentAssets',
        regexPatterns: [/(Tài|Tải)(\s?)(sản|sẵn|sin|săn)(\s?)ngắn(\s?)hạn(\s?)(khác|khắc|khảcợ)(\s?).+/g]
    },
    {
        code: 'longTermAssets',
        regexPatterns: [/(TÀI|TẢI)(\s?)(SẢN|SÁN|SÂN|SÀN|SẲN|SẢẲN|SẴẲN|SẴN|SẮN|SẮN)(\s?)(DÀI|DẢI)(\s?)HẠN(\s?).+/g]
    },
    {
        code: 'longTermReceivables',
        regexPatterns: [
            /(Các|Cắc)(\s?)(khoản|khoan|khoăn|khoắn|khoán|khoän)(\s?)(phải|phảị|phái)(\s?)(thu|thư)(\s?)(dài|ưài|dãi|uài|đài)(\s?)hạn(\s?).+/g,
            /Phải(\s?)thu(\s?)(dài|ưài|dãi|uài|đài)(\s?)hạn(\s?).+/g
        ]
    },
    {
        code: 'tangibleAssets',
        regexPatterns: [/(Tài|Tải)(\s?)(sản|sẵn|sin|săn)(\s?)(cố|cổ|có|cỗ|cô)(\s?)định(\s?)hữu(\s?)(hình|hỉnh|hlnh)(\s?).+/g]
    },
    {
        code: 'intangibleAssets',
        regexPatterns: [
            /(Tài|Tải)(\s?)(sản|sẵn|sin|săn)(\s?)(cố|cổ|có|cỗ|cô)(\s?)định(\s?)(vô|võ|vở|về)(\s?)(hình|hỉnh|hlnh)(\s?).+/g,
            /Tài(\s?)(sản|sẵn|sin|săn)(\s?)(vô|võ)(\s?)hình(\s?).+/g,
            /TSCĐ(\s?)(vô|võ)(\s?)hình(\s?).+/g
        ]
    },
    {
        code: 'goodwill',
        regexPatterns: [/Lợi(\s?)thế(\s?)thương(\s?)mại(\s?).+/g]
    },
    {
        code: 'totalAssets',
        regexPatterns: [
            /(TỎNG|TỔNG|TÓNG|TÔNG|TÓÔNG|TỎÓNG)(\s?)(CỘNG|CỌNG|GỘNG )(\s?)TÀI(\s?)(SẢN|SÁN|SÂN|SÀN|SẲN|SẢẲN|SẴN)(\s?).+/g,
            /(TỎNG|TỔNG|TÓNG|TÔNG|TÓÔNG|TỎÓNG)(\s?)TÀI(\s?)(SẢN|SÁN|SÂN|SÀN|SẲN|SẢẲN|SẴN)(\s?).+/g
        ]
    },
    {
        code: 'currentLiabilities',
        regexPatterns: [/(Nợ|Ng|Ngợ)(\s?)(ngắn|ngẳn|ngẩÝn|ngẵn)(\s?)hạn(\s?).+/g]
    },
    {
        code: 'longTermDebt',
        regexPatterns: [/(Nợ|Ng|Ngợ)(\s?)(dài|ưài|dãi|uài|đài)(\s?)hạn(\s?).+/g]
    },
    {
        code: 'noncontrollingInterests',
        regexPatterns: [
            /LỢI(\s?)ÍCH(\s?)CỦA(\s?)(CỎ|CỔ)(\s?)ĐÔNG(\s?)THIẾU(\s?)(SÓ|SỐ)(\s?).+/g,
            /Lợi(\s?)ích(\s?)(cỗ|cổ|cô|cỏ)(\s?)đông(\s?)không(\s?)kiểm(\s?)soát(\s?).+/g
        ]
    },
    {
        code: 'stockTreasury',
        regexPatterns: [/(Cổ|Cỗ)(\s?)(phiếu|phiều)(\s?)quỹ(\s?).+/g]
    },
    {
        code: 'cashFromOperations',
        regexPatterns: [
            /(Lưu|Luưu|Luưut|đưu|TLưu|Luu|Lưru|ưu|Xu)(\s?)(chuyển|chuyên|chuyễn|chuyền)(\s?)(tiền|tiên|tiễn)(\s?)(thuần|thuản|thuẫn|thuân|thuằn|thuẩn|thuận)(\n?.*)(\n?.*)(kinh|kiính|hình|kính|kình)(\s?)(doanh|donnh|daanh)(\s?).+/g,
            /(Lưu|Luưu|Luưut|đưu|TLưu|Luu|Lưru|ưu|Xu)(\s?)(chuyển|chuyên|chuyễn|chuyền)(\s?)(tiền|tiên|tiễn)(.*)(kinh|kiính|hình|kính|kình)(\s?)(doanh|donnh|daanh)(\s?).+/g
        ]
    },
    {
        code: 'cashFromInvesting',
        regexPatterns: [
            /(Lưu|Luưu|Luưut|đưu|TLưu|Luu|Lưru|ưu|Xu)(\s?)(chuyển|chuyên|chuyễn|chuyền)(\s?)(tiền|tiên|tiễn)(\s?)(thuần|thuản|thuẫn|thuân|thun|thuẩn|thuận)(\n?.*)(\n?.*)(đầu|đần|đâu|đu)(\s?)(tư|tưr|t|trc|tr)(\s?).+/g,
            /(Lưu|Luưu|Luưut|đưu|TLưu|Luu|Lưru|ưu|Xu)(\s?)(chuyển|chuyên|chuyễn|chuyền)(\s?)(tiền|tiên|tiễn)(.*)(đầu|đần|đâu|đu)(\s?)(tư|tưr|t|trc|tr)(\s?).+/g
        ]
    },
    {
        code: 'cashFromFinancing',
        regexPatterns: [
            /(Lưu|Luưu|Luưut|đưu|TLưu|Luu|Lưru|ưu|Xu)(\s?)(chuyển|chuyên|chuyễn|chuyền)(\s?)(tiền|tiên|tiễn)(\s?)(thuần|thuản|thuẫn|thuân|thuằn|thuẩn|thuận)(\n?.*)(\n?.*)(tài|tùi)(\s?)chính(\s?).+/g,
            /(Lưu|Luưu|Luưut|đưu|TLưu|Luu|Lưru|ưu|Xu)(\s?)(chuyển|chuyên|chuyễn|chuyền)(\s?)(tiền|tiên|tiễn)(.*)(tài|tùi)(\s?)chính(\s?).+/g
        ]
    },
    {
        code: 'totalRevenue',
        regexPatterns: [
            /(Doanh|Dnanh)(\s?)(thu|thụ)(\s?)(thuần|thuản|thuẫn|thuằn|thuận)(\n?.*)(\n?.*)(cắp|cấp|cậấp|sấp|câp)(\n?.*)(\n?.*)(dịch|dịnh)(\s?)(vụ|vọ)(\s?).+/g,
            /(Doanh|Dnanh)(\s?)(thu|thụ)(\s?)(thuần|thuản|thuẫn|thuằn|thuận)(\s?).+/g
        ]
    },
    {
        code: 'incomeBeforeTax',
        regexPatterns: [
            /Tổng(\s?)lợi(\s?)nhuận(\s?)(kế|kể)(\s?)toán(\n?.*)(\n?.*)trước(\s?)(thuế|thuê)(\s?).+/g,
            /Tổng(\s?)lợi(\s?)nhuận(\s?)trước(\s?)(thuế|thuê)(\s?).+/g,
            /Lợi(\s?)nhuận(\s?)trước(\s?)(thuế|thuê)(\s?).+/g
        ]
    },
    {
        code: 'netIncome',
        regexPatterns: [
            /(Lợi|Lựi)(\s?)nhuận(\s?)sau(.*)(thuế|thuê)(.*)của(\n?.*)(\n?.*)không(\s?)kiểm(\s?)soát.+/g,
            /(Lợi|Lựi)(\s?)nhuận(\s?)sau(.*)(thuế|thuê)(\n?.*)(\n?.*)thu(\n?.*)(\n?.*)nhập(\n?.*)(\n?.*)doanh(\n?.*)(\n?.*)nghiệp(\s?).+/g,
            /(Lợi|Lựi)(\s?)nhuận(\s?)sau(.*)(thuế|thuê)(\n?.*)(\n?.*)(TNDN|\s?).+/g
        ],
        ignorePatterns: [/Lợi(\s?)nhuận(\s?)sau(\n?.*)(\n?.*)thuế(\n?.*)(\n?.*)chưa(\n?.*)(\n?.*)phân(\s?)phối.+/g]
    }
];

module.exports = {
    crawlFromImages,
    findInText,
    FIELDS
}