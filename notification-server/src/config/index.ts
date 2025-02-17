
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Configuration schema
const configSchema = z.object({
  port: z.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  vapidPublicKey: z.string().min(1),
  vapidPrivateKey: z.string().min(1),
  supabaseUrl: z.string().url(),
  supabaseServiceKey: z.string().min(1),
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]).default(['http://localhost:5173', 'https://89bd4db4-56a9-42cc-a890-6f3507bfb0c7.lovableproject.com']),
  }),
  publicUrl: z.string().url().default('https://your-notification-server-url.com'),
});

// Parse and validate configuration
export const config = configSchema.parse({
  port: Number(process.env.PORT),
  nodeEnv: process.env.NODE_ENV,
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'https://89bd4db4-56a9-42cc-a890-6f3507bfb0c7.lovableproject.com'],
  },
  publicUrl: process.env.PUBLIC_URL,
});
