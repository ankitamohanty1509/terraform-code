const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

console.log('Starting backend server...');
console.log('DB Host:', process.env.DB_HOST);
console.log('DB User:', process.env.DB_USER);
console.log('DB Name:', process.env.DB_NAME);

// Create connection pool with improved RDS settings
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  maxIdle: 2,
  idleTimeout: 60000,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  reconnect: true,
  multipleStatements: false
});

// Test initial connection and create table
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    // Don't return, let the app start even if DB is temporarily unavailable
    console.log('App will continue to start, database will retry on requests');
  } else {
    console.log('Connected to MySQL successfully');
    
    // Create users table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        hobby VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    connection.query(createTableQuery, (err) => {
      if (err) {
        console.error('Error creating users table:', err);
      } else {
        console.log('Users table ready');
      }
      connection.release(); // Release connection back to pool
    });
  }
});

// Health check endpoint with database status
app.get('/health', (req, res) => {
  // Test database connection in health check
  pool.query('SELECT 1', (err) => {
    if (err) {
      res.status(503).json({ 
        status: 'Backend running but database unavailable', 
        timestamp: new Date().toISOString(),
        dbError: err.message 
      });
    } else {
      res.json({ 
        status: 'Backend and database are running', 
        timestamp: new Date().toISOString() 
      });
    }
  });
});

// Get all users endpoint for demo
app.get('/api/users', (req, res) => {
  const sql = 'SELECT * FROM users ORDER BY created_at DESC';
  pool.execute(sql, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ message: 'Error fetching data', error: err.message });
    }
    console.log(`Retrieved ${results.length} users`);
    res.json({ users: results, count: results.length });
  });
});

// Save user data endpoint with improved error handling
app.post('/api/save', (req, res) => {
  const { name, hobby } = req.body;
  console.log('Received data:', { name, hobby });
  
  if (!name || !hobby) {
    return res.status(400).json({ message: 'Name and hobby are required' });
  }
  
  const sql = 'INSERT INTO users (name, hobby) VALUES (?, ?)';
  
  // Use pool.execute for prepared statements (more secure and efficient)
  pool.execute(sql, [name, hobby], (err, result) => {
    if (err) {
      console.error('Error saving data:', err);
      // Check if it's a connection error and provide appropriate message
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
        return res.status(503).json({ message: 'Database connection lost, please try again', error: 'CONNECTION_ERROR' });
      }
      return res.status(500).json({ message: 'Error saving data', error: err.message });
    }
    console.log('Data saved successfully, ID:', result.insertId);
    res.json({ 
      message: 'Data saved successfully!', 
      id: result.insertId,
      data: { name, hobby }
    });
  });
});

// Get user count endpoint
app.get('/api/count', (req, res) => {
  const sql = 'SELECT COUNT(*) as total FROM users';
  pool.execute(sql, (err, results) => {
    if (err) {
      console.error('Error counting users:', err);
      return res.status(500).json({ message: 'Error counting data', error: err.message });
    }
    const count = results[0].total;
    console.log(`Total users count: ${count}`);
    res.json({ count: count });
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening on 0.0.0.0:${port}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  pool.end(() => {
    console.log('Database connection pool closed');
    process.exit(0);
  });
});
