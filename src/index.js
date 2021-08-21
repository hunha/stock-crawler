const stockCrawler = require('./crawlers/stock-crawler');
const financialCrawler = require('./crawlers/financial-crawler');
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (request, response) => {
    response.json({ info: 'Node.js, Express, and Postgres API' })
})

app.get('/crawl-stocks', (request, response) => {
    stockCrawler.crawStock();
    response.json({ info: 'crawling' })
})

app.get('/crawl-financial', (request, response) => {
    financialCrawler.crawlFromImages('C:/workspaces/Test');

    response.json({ info: 'crawling' })
})

app.get('/test-tesseract', (request, response) => {
    const source = request.query.path;
    const ocrUtils = require('./common/ocr-utils');

    ocrUtils.recognize(source, 'vie').then((text) => {
        console.log(text);
        response.send(text);
    });
})

app.listen(port, () => { console.log("Server started at port 2400") });