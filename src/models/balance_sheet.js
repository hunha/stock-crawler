const pool = require('./database');

const create = (balanceSheet) => {
    return new Promise((resolve, reject) => {
        const queryString = `INSERT INTO balance_sheet(
            code, 
            current_assets, 
            cash_equivalents, 
            short_term_investments, 
            current_receivables, 
            inventories, 
            other_current_assets, 
            long_term_assets, 
            long_term_receivables, 
            tangible_assets, 
            intangible_assets, 
            goodwill, 
            total_assets, 
            current_liabilities, 
            long_term_debt, 
            total_liabilities, 
            noncontrolling_interests, 
            stock_treasury, 
            preferred_shares) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING code`;

        pool.query(queryString, [
            balanceSheet.code,
            balanceSheet.currentAssets,
            balanceSheet.cashEquivalents,
            balanceSheet.shortTermInvestments,
            balanceSheet.currentReceivables,
            balanceSheet.inventories,
            balanceSheet.otherCurrentAssets,
            balanceSheet.longTermAssets,
            balanceSheet.longTermReceivables,
            balanceSheet.tangibleAssets,
            balanceSheet.intangibleAssets,
            balanceSheet.goodwill,
            balanceSheet.totalAssets,
            balanceSheet.currentLiabilities,
            balanceSheet.longTermDebt,
            balanceSheet.totalLiabilities,
            balanceSheet.noncontrollingInterests,
            balanceSheet.stockTreasury,
            balanceSheet.preferredShares
        ], (error, results) => {
            if (error) {
                reject(error);
            }

            resolve(results);
        });
    });
}


module.exports = {
    create
}