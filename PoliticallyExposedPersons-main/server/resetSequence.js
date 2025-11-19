const { Pool } = require('pg');
const pool = require('./db');

async function resetSequence() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Get the maximum ID from the users table
    const maxIdResult = await client.query('SELECT MAX(id) FROM users');
    const maxId = maxIdResult.rows[0].max || 0;
    
    // Reset the sequence to start from the max ID + 1
    await client.query(`ALTER SEQUENCE users_id_seq RESTART WITH ${maxId + 1}`);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log(`✅ Successfully reset users_id_seq to ${maxId + 1}`);
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('❌ Error resetting sequence:', error);
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the function
resetSequence()
  .then(() => {
    console.log('Script completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
