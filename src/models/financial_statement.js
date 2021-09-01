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

const getByCode = (code) => {
    return new Promise((resolve, reject) => {
        const queryString = 'SELECT * FROM financial_statement WHERE code = $1 LIMIT 1';

        pool.query(queryString, [code], (error, results) => {
            if (error) {
                reject(error);
            }

            resolve(results.rows[0]);
        });
    });
}

const findByStock = (stockCode) => {
    return new Promise((resolve, reject) => {
        const queryString = 'SELECT * FROM financial_statement WHERE stock = $1';

        pool.query(queryString, [stockCode], (error, results) => {
            if (error) {
                reject(error);
            }

            resolve(results.rows);
        });
    });
}

module.exports = {
    create,
    getByCode,
    findByStock
}