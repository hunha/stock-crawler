const pool = require('./database');

const create = (incomeStatement) => {
    return new Promise((resolve, reject) => {
        const queryString = 'INSERT INTO income_statement(code, total_revenue, income_before_tax, net_income) VALUES ($1, $2, $3, $4) RETURNING code';

        pool.query(queryString, [
            incomeStatement.code,
            incomeStatement.totalRevenue,
            incomeStatement.incomeBeforeTax,
            incomeStatement.netIncome
        ], (error, results) => {
            if (error) {
                reject(error);
            }

            resolve(results);
        });
    });
}

const findByCodes = (codes) => {
    return new Promise((resolve, reject) => {
        const queryString = 'SELECT * FROM income_statement WHERE code = ANY ($1)';

        pool.query(queryString, [codes], (error, results) => {
            if (error) {
                reject(error);
            }

            resolve(results.rows);
        });
    });
}

module.exports = {
    create,
    findByCodes
}