const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    // Port-ot ne add meg, mert named instance-nál automatikusan felismeri
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        instanceName: 'SQLEXPRESS'
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then((pool) => {
        console.log("Sikeres MSSQL kapcsolat.");
        return pool;
    })
    .catch((err) => {
        console.error("MSSQL kapcsolati hiba:", err);
        throw err;
    });

module.exports = {
    sql,
    poolPromise
};