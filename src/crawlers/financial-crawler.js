const path = require("path");
const Tesseract = require('tesseract.js');
const fs = require('fs');
const objectUtils = require('../common/object-utils');
const stockUtils = require('../common/stock-utils');
const financialStatementModel = require('../models/financial_statement');
const stockModel = require('../models/stock');

const PAGE_TO_START = 6;
const DEFAULT_STATEMENT_TYPE = 'YEARLY';

const crawlFromImages = async (source) => {
    const stocks = fs.readdirSync(source).map(name => { return { code: name, path: path.join(source, name) }; });
    for (var i = 0; i < stocks.length; i++) {
        console.log('--process on stock', stocks[i].code);

        const stock = await stockModel.getBySymbol(stocks[i].code);
        if (!stock) {
            continue;
        }

        const stockSheets = await readStockSheets(stocks[i].path);

        for (var j = 0; j < stockSheets.length; j++) {
            const sheet = stockSheets[j];

            const statement = {
                code: stockUtils.composeFinancialStatementCode(DEFAULT_STATEMENT_TYPE, sheet.year, sheet.year),
                stock: stock.code,
                statement_type: DEFAULT_STATEMENT_TYPE,
                statement_year: sheet.year,
                indicate: sheet.year
            };

            console.log('create statement', statement);

            await financialStatementModel.create(statement);
        }
    }

    console.log('--Financial crawling END');
}

const readStockSheets = async (stockSource) => {
    var result = [];

    const years = fs.readdirSync(stockSource).map(name => { return { code: name, path: path.join(stockSource, name) }; });
    for (var j = 0; j < years.length; j++) {
        const year = years[j];

        console.log('--process on year', year.code);
        const yearResult = await readYearlySheet(year.path);

        const data = objectUtils.entriesToObject(yearResult, 'code', 'amount');
        data.year = year.code;

        result.push(data);
    }

    return result;
}

const readYearlySheet = async (imageSource) => {
    var fieldsToFind = Array.from(FIELDS);
    var lastResults = [];

    const files = fs.readdirSync(imageSource).map(name => path.join(imageSource, name));

    var page = PAGE_TO_START;
    while (fieldsToFind.length > 0 && page < files.length) {
        console.log('--process on', files[page], fieldsToFind.map(f => f.code));

        const result = await Tesseract.recognize(
            files[page],
            'vie'
            // { logger: m => console.log(m) }
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
        var fieldFounds;

        for (var j = 0; j < fields[i].regexPatterns.length; j++) {
            fieldFounds = text.match(fields[i].regexPatterns[j]);
            if (!!fieldFounds) break;
        }

        if (!!fieldFounds) {
            var amountFounds = fieldFounds[0].match(/(\d+\.)+\d+/g);
            if (!!amountFounds) {
                results.push({
                    code: fields[i].code,
                    amount: amountFounds[0]
                });
            }
        }
    }

    return results;
}

const FIELDS = [
    {
        code: 'currentAsset',
        regexPatterns: [/TÀI SẢN NGẮN HẠN .+/g] // Use a list of regex instead
    },
    {
        code: 'cashEquivalents',
        regexPatterns: [/Tiền và các khoản tương đương tiền .+/g, /Tiền .+/g]
    },
    {
        code: 'totalLiabilities',
        regexPatterns: [/NỢPHẢI TRẢ .+/g, /NỢ PHẢI TRẢ .+/g, /NỢ PHÁI TRẢ .+/g]
    }
];

module.exports = {
    crawlFromImages
}