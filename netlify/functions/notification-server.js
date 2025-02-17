
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const webPush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:5173',
    'https://89bd4db4-56a9-42cc-a890-6f3507bfb0c7.lovableproject.com'
  ],
  credentials: true
}));

app.use(express.json());

// Web-push configuration
webPush.setVapidDetails(
  'mailto:contact@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get VAPID public key
app.get('/.netlify/functions/notification-server/vapid/public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Subscribe to notifications
app.post('/.netlify/functions/notification-server/notifications/subscribe', async (req, res) => {
  try {
    const { endpoint, keys, userAgent } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { error: insertError } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: userAgent
      });

    if (insertError) {
      console.error('Error saving subscription:', insertError);
      return res.status(500).json({ error: 'Server error' });
    }

    res.status(201).json({ message: 'Subscription saved' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unsubscribe from notifications
app.post('/.netlify/functions/notification-server/notifications/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { error: deleteError } = await supabase
      .from('push_subscriptions')
      .delete()
      .match({ user_id: user.id, endpoint });

    if (deleteError) {
      console.error('Error deleting subscription:', deleteError);
      return res.status(500).json({ error: 'Server error' });
    }

    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check subscription status
app.get('/.netlify/functions/notification-server/notifications/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { endpoint } = req.query;

    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: subscription } = await supabase
      .from('push_subscriptions')
      .select()
      .match({ user_id: user.id, endpoint })
      .single();

    res.json({ isActive: !!subscription });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports.handler = serverless(app);
