const pool = require('./database');

const create = (financialStatement) => {
    return new Promise((resolve, reject) => {
        const queryString = 'INSERT INTO financial_statement(code, stock, statement_type, statement_year, indicate) VALUES($1, $2, $3, $4, $5) RETURNING code';

        pool.query(queryString, [
            financialStatement.code,
            financialStatement.stock,
            financialStatement.statement_type,
            financialStatement.statement_year,
            financialStatement.indicate
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