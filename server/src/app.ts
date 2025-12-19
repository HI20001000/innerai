import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import meetingsRoutes from './routes/meetingsRoutes.js';
import followupsRoutes from './routes/followupsRoutes.js';
import { config } from './config.js';
import { errorHandler } from './middlewares/errorHandler.js';

export const buildApp = () => {
  const app = express();
  app.use(
    cors({
      origin: config.corsOrigins.length ? config.corsOrigins : '*',
      credentials: true,
    }),
  );
  app.use(express.json({ limit: config.bodyLimit }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api', settingsRoutes);
  app.use('/api/meetings', meetingsRoutes);
  app.use('/api/followups', followupsRoutes);

  app.use(errorHandler);
  return app;
};
