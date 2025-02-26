const express = require('express');
const cors = require('cors');
const sql = require('mssql');
require('dotenv').config();

let users = [{ username: 'svc_dba_refresh', password: 'Temporal01.'}];

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('SQL Web App Backend is Running!');
});

app.get('/login', (req, res) => {
  res.send('Login endpoint is working, but use POST to Authenticate.');
});

app.post('/login', (req, res) => {
  console.log('Login attempt:', req.body);
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username && u.password === password);
  if (user) {
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
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

app.listen(5014, () => console.log('Server running on port 5014'));