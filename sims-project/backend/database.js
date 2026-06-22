const { Pool } = require('pg');
require('dotenv').config();

// Connect to Supabase's underlying PostgreSQL database
const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: {
    rejectUnauthorized: false // Required for connecting to Supabase safely
  }
});

// Test the connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to Supabase:', err.stack);
  } else {
    console.log('✅ Successfully connected to Supabase PostgreSQL');
  }
  if (release) release();
});

// Export the pool so your routes can use it
module.exports = pool;