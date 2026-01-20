const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const OUTPUT_FILE = path.join(__dirname, '../database/full_backup.sql');

async function exportDatabase() {
    console.log('Starting database export...');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'mobilis_dashboard',
        multipleStatements: true
    });

    try {
        let sqlDump = `-- Database dump generated on ${new Date().toISOString()}\n`;
        sqlDump += `-- Host: ${process.env.DB_HOST || 'localhost'}    Database: ${process.env.DB_NAME || 'mobilis_dashboard'}\n\n`;

        // Get tables
        const [tables] = await connection.query('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]);

        for (const tableName of tableNames) {
            console.log(`Processing table: ${tableName}`);

            // Drop table statement
            sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;

            // Create table statement
            const [createResult] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
            sqlDump += `${createResult[0]['Create Table']};\n\n`;

            // Data
            const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
            if (rows.length > 0) {
                sqlDump += `INSERT INTO \`${tableName}\` VALUES `;
                const values = rows.map(row => {
                    const rowValues = Object.values(row).map(val => {
                        if (val === null) return 'NULL';
                        if (typeof val === 'number') return val;
                        // Escape single quotes and backslashes
                        return `'${new Date(val).toString() !== 'Invalid Date' && typeof val !== 'string' ? val.toISOString().slice(0, 19).replace('T', ' ') : String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
                    });
                    return `(${rowValues.join(', ')})`;
                });
                sqlDump += values.join(',\n') + ';\n\n';
            }
        }

        fs.writeFileSync(OUTPUT_FILE, sqlDump);
        console.log(`Database exported successfully to ${OUTPUT_FILE}`);

    } catch (error) {
        console.error('Export failed:', error);
    } finally {
        await connection.end();
    }
}

exportDatabase();
