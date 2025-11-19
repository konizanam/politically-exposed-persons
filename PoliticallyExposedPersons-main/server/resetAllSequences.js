const pool = require('./db');

async function resetAllSequences() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Get a list of all tables with sequences
    const tablesResult = await client.query(`
      SELECT 
        c.relname AS table_name,
        a.attname AS column_name,
        s.relname AS sequence_name
      FROM 
        pg_class c
        JOIN pg_attribute a ON c.oid = a.attrelid
        JOIN pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_class s ON s.oid = regexp_replace(d.adbin, E'^.*nextval\\(''\([^'']*\)''.*$', E'\\1')::regclass::oid
      WHERE 
        c.relkind = 'r'
        AND n.nspname = 'public'
        AND d.adbin ~ 'nextval'
      ORDER BY 
        c.relname, a.attname;
    `);
    
    // Reset each sequence
    for (const row of tablesResult.rows) {
      // Get the maximum ID for this table
      const maxIdResult = await client.query(`SELECT MAX(${row.column_name}) AS max FROM ${row.table_name}`);
      const maxId = maxIdResult.rows[0].max || 0;
      
      // Reset the sequence to start from the max ID + 1
      await client.query(`ALTER SEQUENCE ${row.sequence_name} RESTART WITH ${maxId + 1}`);
      
      console.log(`✅ Reset sequence ${row.sequence_name} for table ${row.table_name} to ${maxId + 1}`);
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('All sequences have been reset successfully.');
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('❌ Error resetting sequences:', error);
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the function
resetAllSequences()
  .then(() => {
    console.log('Script completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
