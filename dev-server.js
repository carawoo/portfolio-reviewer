import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import analyzeHandler from './api/analyze.js';
import searchCompanyHandler from './api/search-company.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware to parse JSON
app.use(express.json({ limit: '50mb' }));

// CORS middleware for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// API routes
app.post('/api/analyze', async (req, res) => {
  try {
    console.log('📥 Received analyze request');
    await analyzeHandler(req, res);
  } catch (error) {
    console.error('❌ Error in /api/analyze:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/search-company', async (req, res) => {
  try {
    console.log('📥 Received search-company request');
    await searchCompanyHandler(req, res);
  } catch (error) {
    console.error('❌ Error in /api/search-company:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Development server running at http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'dist')}`);
  console.log(`🔧 API endpoints available at /api/*`);
});
