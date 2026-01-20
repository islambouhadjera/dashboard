const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mobilis_dashboard',
  port: process.env.DB_PORT || 3306,
  ssl: {
    rejectUnauthorized: false // Required for some TiDB/Cloud deployments
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = {
  query: async (text, params) => {
    const [rows] = await pool.execute(text, params);
    return { rows };
  }
};
