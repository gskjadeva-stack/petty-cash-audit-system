import './env.js';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import { authMiddleware } from './middleware/auth.js';

export function createAuthApp() {
  const app = express();

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

  app.use(
    cors({
      origin: corsOrigin.split(',').map((o) => o.trim()),
      credentials: true,
    })
  );

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authMiddleware, authRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}
