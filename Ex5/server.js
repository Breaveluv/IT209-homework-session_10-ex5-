const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// PostgreSQL connection pool using environment variables
const pool = new Pool({
  host: process.env.DB_HOST || 'database',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'app_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'secretpassword123',
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Homework Session 10 - Exercise 5 Docker Compose Multi-Service Architecture',
    service: 'Backend API',
    orchestration: 'Docker Compose v2',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Database connectivity check endpoint
app.get('/api/db-check', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    res.json({
      success: true,
      message: 'Successfully connected to PostgreSQL via Docker Compose internal network',
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      currentTime: result.rows[0].current_time,
      postgresVersion: result.rows[0].pg_version
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend service listening on port ${PORT}`);
});
