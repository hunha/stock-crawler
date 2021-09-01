const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const httpUtils = require('../common/http-utils');
const stockUtils = require('../common/stock-utils');
const dateUtils = require('../common/date-utils');
const stockModel = require('../models/stock');

const HOSE_CRAWLING_HOST = 'www.hsx.vn';
const HOSE_CRAWLING_PATH = '/Modules/Listed/Web/SymbolList?pageFieldName1=Code&pageFieldValue1=&pageFieldOperator1=eq&pageFieldName2=Sectors&pageFieldValue2=&pageFieldOperator2=&pageFieldName3=Sector&pageFieldValue3=00000000-0000-0000-0000-000000000000&pageFieldOperator3=&pageFieldName4=StartWith&pageFieldValue4=&pageFieldOperator4=&pageCriteriaLength=4&_search=false&nd=1628946777085&rows=30&sidx=id&sord=desc';

const HNX_CRAWLING_HOST = 'www.hnx.vn';
const HNX_CRAWLING_PATH = '/ModuleIssuer/List/ListSearch_Datas';

const crawStock = () => {
    // crawHOSE();
    crawHNX();
}

const crawHOSE = async () => {
    const exchange = 'HOSE';
    var page = 1;
    var crawling = true;

    while (crawling) {
        const crawlingStocks = await httpUtils.get({
            hostname: HOSE_CRAWLING_HOST,
            path: HOSE_CRAWLING_PATH + `&page=${page}`,
            method: 'GET',
            json: true
        });

        if (crawlingStocks.rows.length === 0) {
            crawling = false;
            console.log('Crawling on HOSE is finished.');
            return;
        }

        const crawlingCodes = crawlingStocks.rows.map(r => {
            return stockUtils.composeStockCode(exchange, r.cell[1]);
        })

        stockModel.findByCodes(crawlingCodes).then((stocks) => {
            const existedCodes = stocks.map(s => s.code);
            const updatingCodes = crawlingCodes.filter(c => existedCodes.includes(c));

            for (var i = 0; i < crawlingStocks.rows.length; i++) {
                const symbol = crawlingStocks.rows[i].cell[1];
                const code = stockUtils.composeStockCode(exchange, symbol);

                if (updatingCodes.includes(code)) {
                    var stock = stocks.filter(s => s.code === code)[0];
                    stock.name = crawlingStocks.rows[i].cell[4];
                    stock.publicOn = dateUtils.parseVNDate(crawlingStocks.rows[i].cell[7]);
                    stockModel.updateStock(stock);

                    console.log('update stock: ' + code);
                } else {
                    stockModel.createStock({
                        code: code,
                        exchange: exchange,
                        symbol: symbol,
                        name: crawlingStocks.rows[i].cell[4],
                        publicOn: dateUtils.parseVNDate(crawlingStocks.rows[i].cell[7])
                    });

                    console.log('insert stock: ' + code);
                }
            }
        });

        page++;
    }
}

const crawHNX = async () => {
    const exchange = 'HNX';
    var page = 1;
    var crawling = true;

    while (crawling) {
        const html = await httpUtils.post({
            hostname: HNX_CRAWLING_HOST,
            path: HNX_CRAWLING_PATH,
            method: 'POST'
        }, {
            p_issearch: 0,
            p_orderby: 'STOCK_CODE',
            p_ordertype: 'ASC',
            p_currentpage: 1,
            p_record_on_page: 10,
        });

        const dom = new JSDOM(html);
        const test = dom.window.document.querySelector('#_tableDatas');
        console.log(html);

        page++;
        crawling = false;
    }
}

module.exports = {
    crawStock
}