const path = require('path');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const objectUtils = require('../common/object-utils');
const stockUtils = require('../common/stock-utils');
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

const crawlStockSheets = async (stock, imageSource) => {
    const years = fs.readdirSync(imageSource).map(name => { return { code: name, path: path.join(imageSource, name) }; });
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

const readYearlySheet = async (imageSource) => {
    var fieldsToFind = Array.from(FIELDS);
    var lastResults = [];

    const files = fs.readdirSync(imageSource).map(name => path.join(imageSource, name));

    const pageToEnd = PAGE_TO_END - 1;
    var page = PAGE_TO_START - 1;

    while (fieldsToFind.length > 0 && page < pageToEnd) {
        console.log('--process on', files[page]);

        const result = await Tesseract.recognize(
            files[page],
            'vie'
        );

        const text = result.data.text;
        const results = findInText(text, fieldsToFind);

        lastResults = lastResults.concat(results);

        const foundFieldCodes = results.map(r => r.code);
        fieldsToFind = fieldsToFind.filter(f => !foundFieldCodes.includes(f.code));

        page++;
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
            var amountFounds = fieldFounds[0].match(/\(?(\d+(\.|\,)){2,}\d+\)?/g);
            if (!!amountFounds) {
                const isNegative = amountFounds[0].indexOf('(') > -1;
                var amount = amountFounds[0].replaceAll('.', '').replaceAll(',', '').replace('(', '').replace(')', '');
                amount = isNegative ? -amount : amount;
                results.push({
                    code: fields[i].code,
                    amount: amount
                });
            }
        }
    }

    return results;
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
        regexPatterns: [/(TÀI|TẢI)(\s?)(SẢN|SÁN|SÂN|SÀN|SẲN|SẢẲN|SẴẲN|SẴN)(\s?)(NGẮN|NGÁN)(\s?)HẠN(\s?).+/g]
    },
    {
        code: 'cashEquivalents',
        regexPatterns: [
            /(Tiền|Tiễn|Tiển)(\s?)và(\s?)các(\n?.*)(\n?.*)(khoản|khoăn)(\n?.*)(\n?.*)tương(\n?.*)(\n?.*)(đương|đượơng|đượng)(\n?.*)(\n?.*)(tiền|tiên)(\s?).+/g,
            /(Tiền|Tiên|Tiển)(\s?).+/g
        ]
    },
    {
        code: 'totalLiabilities',
        regexPatterns: [/NỢ(\s?)(PHẢI|PHÁI)(\s?)(TRẢ|TRÀẢ|TRA)(\s?).+/g]
    },
    {
        code: 'shortTermInvestments',
        regexPatterns: [
            /(Đầu|Dầu)(\s?)tư(\s?)(tài|lài)(\s?)(chính|chjnh)(\s?)(ngắn|ngẩn|ngẫn)(\s?)hạn(\s?).+/g,
            /Các(\s?)(khoán|khoản)(\s?)đầu(\s?)tư(\s?)(tài|lài)(\s?)(chính|chjnh)(\s?)(ngắn|ngẩn|ngẫn)(\s?)hạn(\s?).+/g,
            /Các(\s?)(khoán|khoản)(\s?)đầu(\s?)tư(\s?)(ngắn|ngẩn|ngẫn)(\s?)hạn(\s?).+/g
        ]
    },
    {
        code: 'currentReceivables',
        regexPatterns: [/(Các|Cắc)(\s?)(khoản|khoan|khoăn)(\s?)(phải|phảị|phái)(\s?)(thu|thư)(\s?)(ngắn|ngẫn|ngẳn|ugẳn)(\s?)hạn(\s?).+/g]
    },
    {
        code: 'inventories',
        regexPatterns: [/(Hàng|Hãng)(\s?)(tồn|tnn|tổn)(\s?)kho(\s?).+/g]
    },
    {
        code: 'otherCurrentAssets',
        regexPatterns: [/(Tài|Tải)(\s?)(sản|sẵn|sin)(\s?)ngắn(\s?)hạn(\s?)(khác|khắc|khảcợ)(\s?).+/g]
    },
    {
        code: 'longTermAssets',
        regexPatterns: [/(TÀI|TẢI)(\s?)(SẢN|SÁN|SÂN|SÀN|SẲN|SẢẲN|SẴẲN|SẴN)(\s?)(DÀI|DẢI)(\s?)HẠN(\s?).+/g]
    },
    {
        code: 'longTermReceivables',
        regexPatterns: [
            /(Các|Cắc)(\s?)(khoản|khoan|khoăn)(\s?)(phải|phảị|phái)(\s?)(thu|thư)(\s?)dài(\s?)hạn(\s?).+/g,
            /Phải(\s?)thu(\s?)dài(\s?)hạn(\s?).+/g
        ]
    },
    {
        code: 'tangibleAssets',
        regexPatterns: [/(Tài|Tải)(\s?)(sản|sẵn|sin)(\s?)(cố|cổ|có|cỗ)(\s?)định(\s?)hữu(\s?)(hình|hỉnh)(\s?).+/g]
    },
    {
        code: 'intangibleAssets',
        regexPatterns: [
            /(Tài|Tải)(\s?)(sản|sẵn|sin)(\s?)(cố|cổ|có|cỗ)(\s?)định(\s?)(vô|võ|vở|về)(\s?)hình(\s?).+/g,
            /Tài(\s?)(sản|sẵn|sin)(\s?)(vô|võ)(\s?)hình(\s?).+/g
        ]
    },
    {
        code: 'goodwill',
        regexPatterns: [/(unknown) .+/g]
    },
    {
        code: 'totalAssets',
        regexPatterns: [/(TỎNG|TỔNG|TÓNG|TÔNG|TÓÔNG)(\s?)(CỘNG|CỌNG)(\s?)TÀI(\s?)(SẢN|SÁN|SÂN|SÀN|SẲN|SẢẲN|SẴN)(\s?).+/g]
    },
    {
        code: 'currentLiabilities',
        regexPatterns: [/(Nợ|Ng|Ngợ)(\s?)(ngắn|ngẳn|ngẩÝn)(\s?)hạn(\s?).+/g]
    },
    {
        code: 'longTermDebt',
        regexPatterns: [/(Nợ|Ng|Ngợ)(\s?)(dài|ưài|dãi|uài)(\s?)hạn(\s?).+/g]
    },
    {
        code: 'noncontrollingInterests',
        regexPatterns: [/(unknown) .+/g]
    },
    {
        code: 'stockTreasury',
        regexPatterns: [/(Cổ|Cỗ)(\s?)(phiếu|phiều)(\s?)quỹ(\s?).+/g]
    },
    {
        code: 'preferredShares',
        regexPatterns: [/(unknown) .+/g]
    },
    {
        code: 'cashFromOperations',
        regexPatterns: [/(Lưu|Luưu|Luưut|đưu|TLưu|Luu)(\s?)(chuyển|chuyên|chuyễn|chuyền)(\s?)(tiền|tiên|tiễn)(\s?)(thuần|thuản|thuẫn|thuân|thuằn|thuẩn|thuận)(\n?.*)(\n?.*)(kinh|kiính|hình|kính|kình)(\s?)(doanh|donnh)(\s?).+/g]
    },
    {
        code: 'cashFromInvesting',
        regexPatterns: [
            /(Lưu|Luưu|Luưut|đưu|TLưu|Luu)(\s?)(chuyển|chuyên|chuyễn|chuyền)(\s?)(tiền|tiên|tiễn)(\s?)(thuần|thuản|thuẫn|thuân|thuằn|thuẩn|thuận)(\n?.*)(\n?.*)(đầu|đần|đâu)(\s?)(tư|tưr|t)(\s?).+/g
        ]
    },
    {
        code: 'cashFromFinancing',
        regexPatterns: [/(Lưu|Luưu|Luưut|đưu|TLưu|Luu)(\s?)(chuyển|chuyên|chuyễn|chuyền)(\s?)(tiền|tiên|tiễn)(\s?)(thuần|thuản|thuẫn|thuân|thuằn|thuẩn|thuận)(\n?.*)(\n?.*)(tài|tùi)(\s?)chính(\s?).+/g]
    },
    {
        code: 'totalRevenue',
        regexPatterns: [
            /(Doanh|Dnanh)(\s?)thu(\s?)(thuần|thuản|thuẫn|thuằn|thuận)(\n?.*)(\n?.*)(cắp|cấp|cậấp|sấp)(\n?.*)(\n?.*)(dịch|dịnh)(\s?)(vụ|vọ)(\s?).+/g,
            /(Doanh|Dnanh)(\s?)thu(\s?)(thuần|thuản|thuẫn|thuằn|thuận)(\s?).+/g
        ]
    },
    {
        code: 'incomeBeforeTax',
        regexPatterns: [
            /Tổng(\s?)lợi(\s?)nhuận(\s?)(kế|kể)(\s?)toán(\s?)trước(\s?)(thuế|thuê)(\s?).+/g,
            /Lợi(\s?)nhuận(\s?)trước(\s?)(thuế|thuê)(\s?).+/g
        ]
    },
    {
        code: 'netIncome',
        regexPatterns: [
            /(Lợi|Lựi)(\s?)nhuận(\s?)sau(\n?.*)(\n?.*)(thuế|thuê)(\n?.*)(\n?.*)thu(\n?.*)(\n?.*)nhập(\n?.*)(\n?.*)doanh(\n?.*)(\n?.*)nghiệp(\s?).+/g,
            /(Lợi|Lựi)(\s?)nhuận(\s?)sau(\n?.*)(\n?.*)thuế(\n?.*)(\n?.*)(TNDN|\s?).+/g
        ],
        ignorePatterns: [/Lợi(\s?)nhuận(\s?)sau(\n?.*)(\n?.*)thuế(\n?.*)(\n?.*)chưa(\n?.*)(\n?.*)phân(\s?)phối.+/g]
    }
];

module.exports = {
    crawlFromImages,
    findInText,
    FIELDS
}