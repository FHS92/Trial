import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import apiRouter from './routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const isDev = process.env.NODE_ENV !== 'production';

// Middleware
app.use(cors({
  origin: isDev ? ['http://localhost:5173', 'http://localhost:3001'] : true,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', apiRouter);

// Serve static client files in production
if (!isDev) {
  const clientDistPath = path.join(__dirname, '../dist/client');
  app.use(express.static(clientDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎨 FactCanvas server running on port ${PORT}`);
  console.log(`   Mode: ${isDev ? 'development' : 'production'}`);
  const hasApiKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  console.log(`   Gemini API: ${hasApiKey ? '✅ configured' : '⚠️  not configured (demo mode active)'}`);
  if (isDev) {
    console.log(`   API: http://localhost:${PORT}/api`);
    console.log(`   Client: http://localhost:5173 (run npm run dev:client)`);
  }
});
