const sql = require('mssql');

const dbServer = process.env.DB_SERVER || "";
const isAzureSqlServer = /\.database\.windows\.net$/i.test(dbServer);

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: dbServer,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || (isAzureSqlServer ? "1433" : "4000"), 10),
    options: {
        encrypt: isAzureSqlServer,
        trustServerCertificate: !isAzureSqlServer,
    },
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then((pool) => {
        console.log("Sikeres MSSQL kapcsolat.");
        return pool;
    })
    .catch((err) =>{
        console.error("MSSQL kapcsolati hiba:", err);
        throw err;
    })
module.exports = {
    sql, poolPromise
}
