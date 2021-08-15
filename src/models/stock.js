const Pool = require('pg').Pool
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'StockDatabase',
    password: 'sa123456',
    port: 5432,
})

const createStock = (code, exchange, symbol, name, publicOn) => {
    return new Promise((resolve, reject) => {
        const queryString = 'INSERT INTO stocks(code, exchange, symbol, name, public_on) VALUES($1, $2, $3, $4, $5) RETURNING code';

        pool.query(queryString, [code, exchange, symbol, name, publicOn], (error, results) => {
            if (error) {
                reject(error);
            }

            resolve(results);
        });
    });
}

const updateStock = (code, exchange, symbol, name, publicOn) => {
    return new Promise((resolve, reject) => {
        const queryString = 'UPDATE stocks SET exchange = $2, symbol = $3, name = $4, public_on = $5 WHERE code = $1';

        pool.query(queryString, [code, exchange, symbol, name, publicOn], (error, results) => {
            if (error) {
                reject(error);
            }

            resolve(results);
        });
    });
}

const findByCodes = (codes) => {
    return new Promise((resolve, reject) => {
        const queryString = 'SELECT * FROM stocks WHERE code = ANY ($1)';

        pool.query(queryString, [codes], (error, results) => {
            if (error) {
                reject(error);
            }

            resolve(results.rows);
        });
    });
}

module.exports = {
    createStock,
    updateStock,
    findByCodes
}