import express from 'express';
import { aiRouter } from './router.ts';

const app = express();
const PORT = Number(process.env.AI_PORT) || 5001;

// CORS middleware allowing any local frontend (port 3000, 5173, etc.)
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-demo-user-id');
  if (_req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// JSON parser with 15MB limit for base64 image uploads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Mount routes at root and /api/ai
app.use('/', aiRouter);
app.use('/api/ai', aiRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(65));
  console.log(`🤖 [AI Forensics & Severity Microservice] Running on http://localhost:${PORT}`);
  console.log(`   - Endpoint: POST http://localhost:${PORT}/verify`);
  console.log(`   - Health:   GET  http://localhost:${PORT}/health`);
  console.log(`   - Model:    ${process.env.GEMINI_API_KEY ? 'Gemini 3.8 Flash Vision' : 'Heuristic Forensics Engine'}`);
  console.log('='.repeat(65));
});
