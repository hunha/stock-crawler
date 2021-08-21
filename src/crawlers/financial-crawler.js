const path = require("path");
const Tesseract = require('tesseract.js');
var fs = require('fs');

const PAGE_TO_START = 6;

const crawlFromImages = async (source) => {
    const stocks = fs.readdirSync(source).map(name => path.join(source, name));
    for (var i = 0; i < stocks.length; i++) {
        const stock = stocks[i];
        console.log('--process on stock', stock);

        const years = fs.readdirSync(stock).map(name => path.join(stock, name));
        for (var j = 0; j < years.length; j++) {
            console.log('--process on year', years[j]);

            const yearResult = await crawlYearlySheet(years[j]);
            console.log('--year result', stock, years[j], yearResult);
        }
    }

    console.log('--Financial crawling END');
}

const crawlYearlySheet = async (imageSource) => {
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