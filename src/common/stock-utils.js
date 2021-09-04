
const composeStockCode = (exchange, symbol) => {
    return exchange + ':' + symbol;
}

const composeFinancialStatementCode = (stockCode, type, year, indicate) => {
    return stockCode + ':' + type + ':' + year + ':' + indicate;
}

module.exports = {
    composeStockCode,
    composeFinancialStatementCode
}