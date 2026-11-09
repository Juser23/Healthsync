const sql = require('mssql');
require('dotenv').config();

const dbSettings = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, 
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'HealthSync',
    options: {
        encrypt: true, // Requerido para AWS RDS / Azure
        trustServerCertificate: true 
    }
};

async function getConnection() {
    try {
        const pool = await sql.connect(dbSettings);
        return pool;
    } catch (error) {
        console.error('[DB] Error de conexión a SQL Server en AWS RDS:', error);
        throw error;
    }
}

module.exports = { getConnection, sql };
