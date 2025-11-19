const { Pool } = require('pg');
require('dotenv').config();

// Determine environment
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;

let pool;

if (isProduction) {
  // Production (Railway) - use internal URL with pips database
  console.log('🚀 Using Production Database (Railway - pips)');
  pool = new Pool({
    connectionString: 'postgresql://postgres:pbniNaKxSMKcbeiTrXDlHLUXKSxpycqu@postgres.railway.internal:5432/pips',
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  // Development - use local PostgreSQL
  console.log('💻 Using Development Database (Local)');
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'pips',
    password: process.env.DB_PASSWORD || 'K0ndj@B0y',
    port: process.env.DB_PORT || 5432,
  });
}

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error connecting to PostgreSQL database:', err);
  } else {
    console.log('✅ Successfully connected to PostgreSQL database');
  }
});

module.exports = pool;