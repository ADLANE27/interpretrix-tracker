
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { notificationRoutes } from './routes/notification.routes';
import { vapidRoutes } from './routes/vapid.routes';
import { notificationService } from './services/notification.service';
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/vapid', vapidRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize notification service
notificationService.initialize()
  .then(() => {
    app.listen(config.port, () => {
      logger.info(`Notification server running on port ${config.port}`);
    });
  })
  .catch(error => {
    logger.error('Failed to initialize notification service:', error);
    process.exit(1);
  });
