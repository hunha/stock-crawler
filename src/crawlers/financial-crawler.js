const { text } = require("express");
const path = require("path");
const Tesseract = require('tesseract.js');
var fs = require('fs');

const PAGE_TO_START = 6;

const crawl = async () => {
    var fieldsToFind = Array.from(FIELDS);
    var lastResults = [];

    const source = 'C:/Stocks/GDT/Fincancial/2020';
    const files = fs.readdirSync(source).map(name => path.join(source, name));

    var page = PAGE_TO_START;
    while (fieldsToFind.length > 0 && page < files.length) {
        console.log('process on', files[page]);

        const result = await Tesseract.recognize(
            files[page],
            'vie'
            // { logger: m => console.log(m) }
        );

        const text = result.data.text;
        const results = findInText(text, fieldsToFind);
        console.log('found', results);

        lastResults = lastResults.concat(results);

        const foundFieldCodes = results.map(r => r.code);
        fieldsToFind = fieldsToFind.filter(f => !foundFieldCodes.includes(f.code));

        page++;
    }

    console.log('result', lastResults);
}

const findInText = (text, fields) => {
    const results = [];

    for (var i = 0; i < fields.length; i++) {
        var fieldFounds = text.match(fields[i].regex);
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

const testTesseract = async (path) => {
    const result = await Tesseract.recognize(
        path,
        'vie',
        { logger: m => console.log(m) }
    );

    const text = result.data.text;
    console.log(text);
}

const FIELDS = [
    {
        code: 'currentAsset',
        regex: /TÀI SẢN NGẮN HẠN .+/g, // Use a list of regex instead
    },
    {
        code: 'cashEquivalents',
        regex: /Tiền và các khoản tương đương tiền .+/g,
    },
    {
        code: 'totalLiabilities',
        regex: /NỢPHẢI TRẢ .+/g, // NỢ PHẢI TRẢ
    }
];

module.exports = {
    crawl,
    testTesseract
}