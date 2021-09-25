const converter = require('json-2-csv');
const stockModel = require('../models/stock');
const financialStatementModel = require('../models/financial_statement');
const balanceSheetModel = require('../models/balance_sheet');
const cashFlowStatementModel = require('../models/cash_flow_statement')
const incomeStatementModel = require('../models/income_statement');

const exportFinancialStatement = async (stockCode) => {
    const stock = await stockModel.getBySymbol(stockCode);

    if (!stock) return;

    const statements = await financialStatementModel.findByStock(stock.code);

    if (!statements) return;

    const statementCodes = statements.map(s => s.code);

    var composedData = {};

    var balanceSheets = await balanceSheetModel.findByCodes(statementCodes);
    balanceSheets = balanceSheets.reverse();
    composedData = collectData(balanceSheets, composedData);

    var cashFlowStatements = await cashFlowStatementModel.findByCodes(statementCodes);
    cashFlowStatements = cashFlowStatements.reverse();
    composedData = collectData(cashFlowStatements, composedData);

    var incomeStatements = await incomeStatementModel.findByCodes(statementCodes);
    incomeStatements = incomeStatements.reverse();
    composedData = collectData(incomeStatements, composedData);

    const exportData = Object.values(composedData);
    return await converter.json2csvAsync(exportData);
}

const collectData = (sheets, composedData) => {
    for (var i = 0; i < sheets.length; i++) {
        const sheet = sheets[i];

        for (const [key, value] of Object.entries(sheet)) {
            var row = composedData[key];

            if (!row) {
                row = { field: key };
                composedData[key] = row;
            }

            row[sheet.code] = value;
        }
    }

    return composedData;
}

module.exports = {
    exportFinancialStatement
}