const sql = require('mssql');

const parseOptionalPort = (value) => {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : undefined;
};

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    port: parseOptionalPort(process.env.DB_PORT),
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

if (!dbConfig.port && process.env.DB_INSTANCE) {
    dbConfig.options.instanceName = process.env.DB_INSTANCE;
}

let poolPromise;

const getPool = async () => {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(dbConfig)
            .connect()
            .then((pool) => {
                console.log("Sikeres MSSQL kapcsolat.");
                return pool;
            })
            .catch((err) => {
                console.error("MSSQL kapcsolati hiba:", err);
                poolPromise = null;
                throw err;
            });
    }

    return poolPromise;
};

module.exports = {
    sql,
    getPool
};