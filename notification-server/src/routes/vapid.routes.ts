
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { validateToken } from '../middleware/auth';
import webpush from 'web-push';
import { logger } from '../utils/logger';

const router = Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

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
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error saving VAPID keys: ${error.message}`);
    }

    // Configure web-push with the new keys
    webpush.setVapidDetails(
      'mailto:contact@interpreters.com',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );

    logger.info('New VAPID keys generated and configured');
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
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      // Si aucune clé n'est trouvée, en générer une nouvelle
      const vapidKeys = webpush.generateVAPIDKeys();
      
      const { data: newKeys, error: insertError } = await supabase
        .from('vapid_keys')
        .insert({
          public_key: vapidKeys.publicKey,
          private_key: vapidKeys.privateKey,
          is_active: true,
          status: 'active'
        })
        .select()
        .single();

      if (insertError) {
        throw new Error('Error saving new VAPID keys');
      }

      // Configure web-push with the new keys
      webpush.setVapidDetails(
        'mailto:contact@interpreters.com',
        vapidKeys.publicKey,
        vapidKeys.privateKey
      );

      logger.info('New VAPID keys generated and configured automatically');
      res.json({ publicKey: vapidKeys.publicKey });
      return;
    }

    // Si une clé existe, la retourner
    res.json({ publicKey: data.public_key });
  } catch (error: any) {
    logger.error('Error fetching VAPID public key:', error);
    res.status(500).json({ error: error.message });
  }
});

export const vapidRoutes = router;
