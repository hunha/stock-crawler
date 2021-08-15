// import stockModel from './models/stock';
const stockCrawler = require('./crawlers/stock-crawler');
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (request, response) => {
    response.json({ info: 'Node.js, Express, and Postgres API' })
})

app.get('/craw-stocks', (request, response) => {
    stockCrawler.crawStock();
    response.json({ info: 'crawling' })
})

app.listen(port, () => { console.log("Server started at port 2400") });