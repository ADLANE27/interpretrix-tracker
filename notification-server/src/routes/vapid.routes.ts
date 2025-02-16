
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { validateToken } from '../middleware/auth';
import webpush from 'web-push';
import { logger } from '../utils/logger';

const router = Router();
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

router.post('/generate', validateToken, async (req, res) => {
  try {
    // Generate new VAPID keys
    const vapidKeys = webpush.generateVAPIDKeys();

    // Save to database
    const { data, error } = await supabase
      .from('vapid_keys')
      .insert({
        public_key: vapidKeys.publicKey,
        private_key: vapidKeys.privateKey,
        is_active: true,
        created_by: req.user!.id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error saving VAPID keys: ${error.message}`);
    }

    logger.info('New VAPID keys generated and saved');
    res.json({ publicKey: data.public_key });
  } catch (error: any) {
    logger.error('Error generating VAPID keys:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/public-key', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vapid_keys')
      .select('public_key')
      .eq('is_active', true)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      throw new Error('No active VAPID key found');
    }

    res.json({ publicKey: data.public_key });
  } catch (error: any) {
    logger.error('Error fetching VAPID public key:', error);
    res.status(500).json({ error: error.message });
  }
});

export const vapidRoutes = router;
