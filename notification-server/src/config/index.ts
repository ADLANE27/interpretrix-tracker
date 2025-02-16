
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  VAPID_PUBLIC_KEY: z.string(),
  VAPID_PRIVATE_KEY: z.string(),
  SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_KEY: z.string(),
  CORS_ORIGIN: z.string().default('*'),
});

const envVars = envSchema.parse(process.env);

export const config = {
  port: parseInt(envVars.PORT, 10),
  nodeEnv: envVars.NODE_ENV,
  vapid: {
    publicKey: envVars.VAPID_PUBLIC_KEY,
    privateKey: envVars.VAPID_PRIVATE_KEY,
  },
  supabase: {
    url: envVars.SUPABASE_URL,
    serviceKey: envVars.SUPABASE_SERVICE_KEY,
  },
  cors: {
    origin: envVars.CORS_ORIGIN,
  },
};
