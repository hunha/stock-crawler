
const composeStockCode = (exchange, symbol) => {
    return exchange + ":" + symbol;
}

module.exports = {
    composeStockCode
}