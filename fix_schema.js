const mysql = require('mysql2/promise');

async function fixSchema() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'root123',
    database: 'riesgos_judiciales_db',
    port: 3306
  });

  try {
    console.log("Checking columns for risk_data_tbl...");
    const [columns] = await connection.execute("DESCRIBE risk_data_tbl");
    const columnNames = columns.map(c => c.Field);
    console.log("Existing columns:", columnNames.join(", "));

    if (!columnNames.includes('residual_impact')) {
      console.log("Adding residual_impact column...");
      await connection.execute("ALTER TABLE risk_data_tbl ADD COLUMN residual_impact INT DEFAULT 0");
    }

    if (!columnNames.includes('residual_probability')) {
      console.log("Adding residual_probability column...");
      await connection.execute("ALTER TABLE risk_data_tbl ADD COLUMN residual_probability INT DEFAULT 0");
    }
    
    if (!columnNames.includes('status')) {
        console.log("Adding status column...");
        await connection.execute("ALTER TABLE risk_data_tbl ADD COLUMN status VARCHAR(50) DEFAULT 'ACTIVO'");
    }

    console.log("Schema fixed successfully.");
  } catch (error) {
    console.error("Error fixing schema:", error);
  } finally {
    await connection.end();
  }
}

fixSchema();
