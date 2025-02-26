const express = require('express');
const cors = require('cors');
const sql = require('mssql');
require('dotenv').config();
const sqlConfig = {
  user: process.env.user,
  password: process.env.password,
  server: process.env.server,
  database: process.env.database,
  port: parseInt(process.env.db_port),
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

let users = [{ username: process.env.user , password: process.env.password}];

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
  const { username, password } = req.body;
  // Ensure credentials are provided
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required" });
  }
  const user = users.find((u) => u.username === username && u.password === password);
  if (user) {
    res.json({ success: true, message: "Login successful", user: { username } });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

app.post('/query', async (req, res) => {
  const { query } = req.body;
  try {
    console.log("Executing Query:", query);
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    console.log("Query Execution failed: ", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/backup', async (req, res) => {
  try {
    const pool = await sql.connect(process.env.SQL_DB_CONFIG);
    await pool.request().query(`BACKUP DATABASE [Powershell] TO DISK = 'M:\\DND_VEGADBS_BACKUP_FILES\\ps.bak'`);
    res.json({ message: 'Backup completed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/checkdb', async (req, res) => {
  try {
    const pool = await sql.connect(process.env.SQL_DB_CONFIG);
    const result = await pool.request().query(`DBCC CHECKDB [Powershell]`);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(5014, () => console.log('Server running on port 5014'));