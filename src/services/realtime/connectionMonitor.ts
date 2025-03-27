import { RealtimeChannel, RealtimePresenceJoinPayload, RealtimePresenceLeavePayload } from '@supabase/supabase-js';
import { eventEmitter, EVENT_CONNECTION_STATUS_CHANGE } from '@/lib/events';
import { supabase } from '@/integrations/supabase/client';
import { RECONNECT_PERIODIC_INTERVAL } from './constants';
import { subscriptionRegistry } from './registry/subscriptionRegistry';
import { SubscriptionStatus } from './registry/types';
