// index.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize database
const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS urls (
        id SERIAL PRIMARY KEY,
        short_id VARCHAR(50) UNIQUE NOT NULL,
        original_url TEXT NOT NULL,
        clicks INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_short_id ON urls(short_id);
    `);
  } finally {
    client.release();
  }
};

initDB().catch(console.error);

// Create short URL
app.post('/shorten', async (req, res) => {
  const client = await pool.connect();
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const shortId = nanoid(8);
    
    const result = await client.query(
      'INSERT INTO urls (short_id, original_url) VALUES ($1, $2) RETURNING *',
      [shortId, url]
    );
    
    res.json({
      shortUrl: `${process.env.BASE_URL}/${shortId}`,
      originalUrl: url,
      shortId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Redirect to original URL
app.get('/:shortId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { shortId } = req.params;
    
    const result = await client.query(
      'UPDATE urls SET clicks = clicks + 1 WHERE short_id = $1 RETURNING original_url',
      [shortId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'URL not found' });
    }
    
    res.redirect(result.rows[0].original_url);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Get URL stats
app.get('/stats/:shortId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { shortId } = req.params;
    
    const result = await client.query(
      'SELECT * FROM urls WHERE short_id = $1',
      [shortId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'URL not found' });
    }
    
    const url = result.rows[0];
    res.json({
      shortId: url.short_id,
      originalUrl: url.original_url,
      clicks: url.clicks,
      createdAt: url.created_at
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

