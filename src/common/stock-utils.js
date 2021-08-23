
const composeStockCode = (exchange, symbol) => {
    return exchange + ":" + symbol;
}

const composeFinancialStatementCode = (type, year, indicate) => {
    return type + ':' + year + ':' + indicate;
}

module.exports = {
    composeStockCode,
    composeFinancialStatementCode
}