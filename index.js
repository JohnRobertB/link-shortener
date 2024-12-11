// index.js
  require('dotenv').config();
  const express = require('express');
  const mongoose = require('mongoose');
  const { nanoid } = require('nanoid');
  const cors = require('cors');
  
  const app = express();
  app.use(express.json());
  app.use(cors());
  
  // Connect to MongoDB
  mongoose.connect(process.env.MONGODB_URI);
  
  // URL Schema
  const urlSchema = new mongoose.Schema({
    originalUrl: {
      type: String,
      required: true,
    },
    shortId: {
      type: String,
      required: true,
      unique: true,
    },
    clicks: {
      type: Number,
      required: true,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    }
  });
  
  const URL = mongoose.model('URL', urlSchema);
  
  // Create short URL
  app.post('/shorten', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }
  
      // Generate unique short ID
      const shortId = nanoid(8);
      
      // Create new URL document
      const urlDoc = new URL({
        originalUrl: url,
        shortId,
      });
      
      await urlDoc.save();
      
      res.json({
        shortUrl: `${process.env.BASE_URL}/${shortId}`,
        originalUrl: url,
        shortId,
      });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });
  
  // Redirect to original URL
  app.get('/:shortId', async (req, res) => {
    try {
      const { shortId } = req.params;
      const url = await URL.findOne({ shortId });
      
      if (!url) {
        return res.status(404).json({ error: 'URL not found' });
      }
  
      // Increment clicks
      url.clicks++;
      await url.save();
      
      res.redirect(url.originalUrl);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });
  
  // Get URL stats
  app.get('/stats/:shortId', async (req, res) => {
    try {
      const { shortId } = req.params;
      const url = await URL.findOne({ shortId });
      
      if (!url) {
        return res.status(404).json({ error: 'URL not found' });
      }
      
      res.json({
        shortId: url.shortId,
        originalUrl: url.originalUrl,
        clicks: url.clicks,
        createdAt: url.createdAt,
      });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  
