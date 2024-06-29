require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const port = process.env.SERVER_PORT;

// Log environment variables
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);

// PostgreSQL client setup
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect((err) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Database connected successfully.');
  }
});

// Fetch data from API and store in PostgreSQL
app.get('/fetch-data', async (req, res) => {
  try {
    const response = await axios.get('https://api.wazirx.com/api/v2/tickers');
    const top10 = Object.values(response.data).slice(0, 10);

    // Clear existing data
    await pool.query('DELETE FROM tickers');

    await Promise.all(
      top10.map(async (item) => {
        const { name, last, buy, sell, volume, base_unit } = item;
        await pool.query(
          'INSERT INTO tickers (name, last, buy, sell, volume, base_unit) VALUES ($1, $2, $3, $4, $5, $6)',
          [name, last, buy, sell, volume, base_unit]
        );
      })
    );

    console.log('Data fetched and stored successfully.');
    res.send('Data fetched and stored successfully.');
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});

// Serve data to frontend
app.get('/get-data', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tickers LIMIT 10');
    // console.log('Data retrieved:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Error retrieving data:', error);
    res.status(500).send('Error retrieving data');
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html at the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
