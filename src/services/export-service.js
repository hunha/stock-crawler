const converter = require('json-2-csv');
const stockModel = require('../models/stock');
const financialStatementModel = require('../models/financial_statement');
const balanceSheetModel = require('../models/balance_sheet');
const cashFlowStatementModel = require('../models/cash_flow_statement')
const incomeStatementModel = require('../models/income_statement');

const exportFinancialStatement = async (stockCode) => {
    const stock = await stockModel.getBySymbol(stockCode);

    if (!stock) return;

    const statements = financialStatementModel.findByStock(stock.code);

    var composedData = {};

    const statementCodes = statements.map(s => s.code);

    const balanceSheets = await balanceSheetModel.findByCodes(statementCodes);
    for (var i = 0; i < balanceSheets.length; i++) {
        const balanceSheet = balanceSheets[i];

        for (const [key, value] of Object.entries(balanceSheet)) {
            var row = composedData[key];

            if (!row) {
                row = { field: key };
                composedData[key] = row;
            }

            row[balanceSheet.code] = value;
        }
    }

    const exportData = Object.values(composedData);
    console.log(exportData);

    return await converter.json2csvAsync(exportData);
}

module.exports = {
    exportFinancialStatement
}