
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { notificationRoutes } from './routes/notification.routes';
import { vapidRoutes } from './routes/vapid.routes';
import webpush from 'web-push';
import { logger } from './utils/logger';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Configure web-push with environment variables
webpush.setVapidDetails(
  'mailto:contact@interpreters.com',
  config.vapidPublicKey,
  config.vapidPrivateKey
);

// Routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/vapid', vapidRoutes);

// Start server
app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});
