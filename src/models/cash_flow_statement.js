const pool = require('./database');

const create = (cashFlowStatement) => {
    return new Promise((resolve, reject) => {
        const queryString = `INSERT INTO cash_flow_statement(code, cash_from_operations, cash_from_investing, cash_from_financing) VALUES($1, $2, $3, $4) RETURNING code`;

        pool.query(queryString, [
            cashFlowStatement.code,
            cashFlowStatement.cashFromOerations,
            cashFlowStatement.cashFromInvesting,
            cashFlowStatement.cashFromFinancing
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