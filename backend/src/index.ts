import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { router as apiRouter } from './routes/index';
import http from 'http';
import { initWebSocketServer } from './realtime/ws';
import { env } from './utils/env';
import { ensureUploadDir } from './utils/fs';

const app = express();

app.use(helmet());
app.use((_req, res, next) => {
  if (env.DEMO_MODE) {
    res.setHeader('X-Justice-Link-Demo', 'synthetic-local-only');
  }
  next();
});
app.use(cors({ origin: (origin, cb) => {
  if (!origin) return cb(null, true);
  if (env.CORS_ORIGINS.includes(origin)) return cb(null, true);
  cb(new Error('Not allowed by CORS'));
}, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health
app.get('/health', (_req, res) => res.json({
  ok: true,
  app: 'Justice Link',
  mode: env.DEMO_MODE ? 'synthetic_demo' : 'standard',
  localOnly: env.HOST === '127.0.0.1' || env.HOST === 'localhost',
}));

// Static files are disabled in demo mode so no uploaded documents are exposed.
if (!env.DEMO_MODE) {
  app.use('/uploads', express.static(env.UPLOAD_DIR));
}

// API
app.use('/api', apiRouter);

const port = env.PORT;
ensureUploadDir();

const server = http.createServer(app);
initWebSocketServer(server);
server.listen(port, env.HOST, () => {
  console.log(`Justice Link backend running on http://${env.HOST}:${port}`);
  console.log(`Mode: ${env.DEMO_MODE ? 'synthetic local demo' : 'standard'}`);
  console.log(`CORS allowed origins: ${env.CORS_ORIGINS.join(', ')}`);
  console.log(`WebSocket endpoint: ws://${env.HOST}:${port}/ws`);
});
