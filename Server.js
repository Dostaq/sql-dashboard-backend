const express = require('express');
const cors = require('cors');
const sql = require('mssql');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('SQL Web App Backend is Running!');
});

app.post('/query', async (req, res) => {
  const { query } = req.body;
  try {
    const pool = await sql.connect(process.env.SQL_DB_CONFIG);
    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/backup', async (req, res) => {
  try {
    const pool = await sql.connect(process.env.SQL_DB_CONFIG);
    await pool.request().query(`BACKUP DATABASE [YourDatabase] TO DISK = 'C:\\Backup\\YourDatabase.bak'`);
    res.json({ message: 'Backup completed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/checkdb', async (req, res) => {
  try {
    const pool = await sql.connect(process.env.SQL_DB_CONFIG);
    const result = await pool.request().query(`DBCC CHECKDB ([YourDatabase])`);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => console.log('Server running on port 5014'));