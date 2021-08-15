const rp = require('request-promise');
const stockModel = require('../models/stock');

const HOSE_CRAWLING_URL = 'https://www.hsx.vn/Modules/Listed/Web/SymbolList?pageFieldName1=Code&pageFieldValue1=&pageFieldOperator1=eq&pageFieldName2=Sectors&pageFieldValue2=&pageFieldOperator2=&pageFieldName3=Sector&pageFieldValue3=00000000-0000-0000-0000-000000000000&pageFieldOperator3=&pageFieldName4=StartWith&pageFieldValue4=&pageFieldOperator4=&pageCriteriaLength=4&_search=false&nd=1628946777085&rows=30&sidx=id&sord=desc';

const crawStock = () => {
    crawHOSE();
}

const crawHOSE = async () => {
    var page = 1;
    var crawling = true;

    while (crawling) {
        const crawlingStocks = await rp({
            uri: HOSE_CRAWLING_URL + `&page=${page}`,
            json: true
        });

        if (crawlingStocks.rows.length === 0) {
            crawling = false;
            console.log('Crawling on HOSE is finished.');
            return;
        }

        const exchange = 'HOSE';

        const crawlingCodes = crawlingStocks.rows.map(r => {
            return exchange + ":" + r.cell[1];
        })

        stockModel.findByCodes(crawlingCodes).then((stocks) => {
            const existedCodes = stocks.map(s => s.code);
            const updatingCodes = crawlingCodes.filter(c => existedCodes.includes(c));

            for (var i = 0; i < crawlingStocks.rows.length; i++) {
                const symbol = crawlingStocks.rows[i].cell[1];
                const name = crawlingStocks.rows[i].cell[4];
                const code = exchange + ":" + symbol;

                var dateParts = crawlingStocks.rows[i].cell[7].split("/");
                const publicOn = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);

                if (updatingCodes.includes(code)) {
                    console.log('update stock: ' + code);
                    stockModel.updateStock(code, exchange, symbol, name, publicOn);
                } else {
                    console.log('insert stock: ' + code);
                    stockModel.createStock(code, exchange, symbol, name);
                }
            }
        });

        page++;
    }
}

module.exports = {
    crawStock
}