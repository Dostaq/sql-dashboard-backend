import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();
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

app.get('/backup', (req, res) => {
  res.send('backup endpoint is working, but use POST to Authenticate.');
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

// **Fetch Database List with Metadata**
app.get('/databases', async (req, res) => {
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request().query(`
      SELECT 
        d.name,
        CAST(SUM(mf.size) * 8 / 1024 AS INT) AS size_MB, -- Convert pages to MB
        d.create_date,
        (SELECT MAX(backup_finish_date) 
         FROM msdb.dbo.backupset 
         WHERE database_name = d.name) AS last_backup
      FROM sys.databases d
      LEFT JOIN sys.master_files mf ON d.database_id = mf.database_id
      GROUP BY d.name, d.create_date
    `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Database fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch databases', error: error.message });
  }
});


// app.get('/databases', async (req, res) => {
//   try {
//     const pool = await sql.connect(sqlConfig);
//     const result = await pool.request().query(`
//       SELECT 
//         name, 
//         size * 8 / 1024 AS size,
//         create_date,
//         (SELECT MAX(backup_finish_date) FROM msdb.dbo.backupset WHERE database_name = name) AS last_backup
//       FROM sys.databases
//       WHERE database_id > 4
//     `);
//     res.json(result.recordset);
//   } catch (error) {
//     res.status(500).json({ message: 'Failed to fetch databases', error: error.message });
//   }
// });

// **Run SQL Queries**
app.post('/query', async (req, res) => {
  const { query } = req.body;
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: 'Query execution failed', error: error.message });
  }
});

// **Initiate Database Backup**
//import fs from 'fs';
//import path from 'path';

// app.post('/backup', async (req, res) => {
//   const { database } = req.body;

//   if (!database) {
//     return res.status(400).json({ message: 'Database name is required' });
//   }

//   try {
//     const pool = await sql.connect(sqlConfig);
    
//     // Define the backup folder and file path
//     const backupFolder = path.join('M:\\DND_VEGADBS_BACKUP_FILES', database);
//     const backupFilePath = path.join(backupFolder, `${database}_${Date.now()}.bak`);

//     // Check if the database folder exists, create if not
//     if (!fs.existsSync(backupFolder)) {
//       fs.mkdirSync(backupFolder, { recursive: true });
//     }

//     // SQL Backup Query
//     const query = `
//       BACKUP DATABASE [${database}] 
//       TO DISK = '${backupFilePath}' 
//       WITH FORMAT, INIT, NAME = '${database}-Full Database Backup'
//     `;

//     await pool.request().query(query);
//     res.json({ message: `Backup started for ${database}`, path: backupFilePath });
//   } catch (error) {
//     console.error('Backup error:', error);
//     res.status(500).json({ message: 'Backup request failed', error: error.message });
//   }
// });

app.post('/backup', async (req, res) => {
  const { database } = req.body;
  const backupPath = `M:\\DND_VEGADBS_BACKUP_FILES\\${database}`; // Adjust path as needed
  const backupFile = `${backupPath}\\${database}_${Date.now()}.bak`;

  try {
      await sql.connect(sqlConfig);

      // Ensure backup folder exists
      await fs.promises.mkdir(backupPath, { recursive: true });

      // Execute backup
      const query = `BACKUP DATABASE [${database}] TO DISK = '${backupFile}' WITH FORMAT, INIT`;
      await sql.query(query);

      res.json({ message: `Backup started for ${database}`, file: backupFile });
  } catch (error) {
      console.error('Backup error:', error);
      res.status(500).json({ message: 'Backup failed', error: error.message });
  }
});

// app.post('/query', async (req, res) => {
//   const { query } = req.body;
//   try {
//     console.log("Executing Query:", query);
//     const pool = await sql.connect(sqlConfig);
//     const result = await pool.request().query(query);
//     res.json(result.recordset);
//   } catch (error) {
//     console.log("Query Execution failed: ", error);
//     res.status(500).json({ error: error.message });
//   }
// });
// const [backupHistory, setBackupHistory] = useState([]);

// const fetchBackupHistory = async () => {
//     try {
//         const res = await axios.get('http://localhost:5014/backup-history');
//         setBackupHistory(res.data);
//     } catch (error) {
//         alert('Failed to fetch backup history: ' + error.message);
//     }
// };

// useEffect(() => {
//     fetchBackupHistory();
// }, []);

app.get('/backup-history', async (req, res) => {
  try {
      await sql.connect(sqlConfig);
      const result = await sql.query(`
          SELECT database_name, backup_finish_date, physical_device_name
          FROM msdb.dbo.backupset
          JOIN msdb.dbo.backupmediafamily
          ON backupset.media_set_id = backupmediafamily.media_set_id
          ORDER BY backup_finish_date DESC
      `);
      res.json(result.recordset);
  } catch (error) {
      res.status(500).json({ message: 'Failed to fetch backup history', error: error.message });
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

app.get('/powershell', async (req, res) => {
  try {
      await sql.connect(sqlConfig);
      res.send("Database connection successful");
  } catch (error) {
      res.status(500).send("Database connection failed: " + error.message);
  }
});


app.listen(5014, () => console.log('Server running on port 5014'));

// const express = require('express');
// const sql = require('mssql');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();
// app.use(express.json());
// app.use(cors());

// const sqlConfig = {
//     user: process.env.user,
//     password: process.env.password,
//     server: process.env.server,
//     database: process.env.database,
//     port: parseInt(process.env.db_port),
//     options: {
//       encrypt: true,
//       trustServerCertificate: true
//     }
//   };

// // **Login Endpoint**
// app.post('/login', async (req, res) => {
//   const { username, password } = req.body;

//   try {
//     const pool = await sql.connect({ ...dbConfig, user: username, password });
//     res.json({ message: 'Login successful' });
//   } catch (error) {
//     res.status(401).json({ message: 'Invalid credentials', error: error.message });
//   }
// });

// // **Fetch Database List with Metadata**
// app.get('/databases', async (req, res) => {
//   try {
//     const pool = await sql.connect(dbConfig);
//     const result = await pool.request().query(`
//       SELECT 
//         name, 
//         size * 8 / 1024 AS size,
//         create_date,
//         (SELECT MAX(backup_finish_date) FROM msdb.dbo.backupset WHERE database_name = name) AS last_backup
//       FROM sys.databases
//       WHERE database_id > 4
//     `);
//     res.json(result.recordset);
//   } catch (error) {
//     res.status(500).json({ message: 'Failed to fetch databases', error: error.message });
//   }
// });

// // **Run SQL Queries**
// app.post('/query', async (req, res) => {
//   const { query } = req.body;
//   try {
//     const pool = await sql.connect(dbConfig);
//     const result = await pool.request().query(query);
//     res.json(result.recordset);
//   } catch (error) {
//     res.status(500).json({ message: 'Query execution failed', error: error.message });
//   }
// });

// // **Initiate Database Backup**
// app.post('/backup', async (req, res) => {
//   const { database } = req.body;

//   if (!database) return res.status(400).json({ message: 'Database name is required' });

//   try {
//     const pool = await sql.connect(dbConfig);
//     const backupQuery = `
//       BACKUP DATABASE [${database}] 
//       TO DISK = 'M:\\DND_VEGADBS_BACKUP_FILES\\${database}_backup.bak' 
//       WITH FORMAT, MEDIANAME = 'SQLServerBackups', NAME = '${database}-Full Backup';
//     `;
//     await pool.request().query(backupQuery);
//     res.json({ message: `Backup started for ${database}` });
//   } catch (error) {
//     res.status(500).json({ message: 'Backup failed', error: error.message });
//   }
// });

//app.listen(5014, () => console.log('Server running on port 5014'));
