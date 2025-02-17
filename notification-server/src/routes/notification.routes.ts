
import { Router } from 'express';
import { notificationService } from '../services/notification.service';
import { validateToken } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

const notificationSchema = z.object({
  title: z.string(),
  body: z.string(),
  data: z.record(z.any()).optional(),
  priority: z.number().min(0).max(10).optional(),
});

router.post('/subscribe', validateToken, async (req, res) => {
  try {
    const subscription = subscriptionSchema.parse(req.body);
    const userId = req.user!.id;

    await notificationService.saveSubscription(userId, subscription);
    res.status(201).json({ message: 'Subscription saved successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/unsubscribe', validateToken, async (req, res) => {
  try {
    const { endpoint } = subscriptionSchema.parse(req.body);
    const userId = req.user!.id;

    await notificationService.removeSubscription(userId, endpoint);
    res.status(200).json({ message: 'Subscription removed successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/send', validateToken, async (req, res) => {
  try {
    const notification = notificationSchema.parse(req.body);
    const userId = req.user!.id;

    await notificationService.queueNotification(userId, notification, notification.priority);
    res.status(200).json({ message: 'Notification queued successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export const notificationRoutes = router;
