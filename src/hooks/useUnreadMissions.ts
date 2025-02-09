
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUnreadMissions = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadMissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[UnreadMissions] No authenticated user found');
        setUnreadCount(0);
        return;
      }

      console.log('[UnreadMissions] Fetching unread missions for user:', user.id);
      
      const { data: missions, error } = await supabase
        .from('interpretation_missions')
        .select('id, status, notified_interpreters')
        .or(`notified_interpreters.cs.{${user.id}},assigned_interpreter_id.eq.${user.id}`)
        .eq('status', 'awaiting_acceptance');

      if (error) {
        console.error('[UnreadMissions] Error fetching missions:', error);
        return;
      }

      // Get declined missions to exclude them
      const { data: declinedNotifications } = await supabase
        .from('mission_notifications')
        .select('mission_id')
        .eq('interpreter_id', user.id)
        .eq('status', 'declined');

      const declinedMissionIds = new Set(declinedNotifications?.map(n => n.mission_id) || []);

      // Filter out declined missions
      const unreadMissions = missions?.filter(mission => !declinedMissionIds.has(mission.id)) || [];
      
      console.log('[UnreadMissions] Unread missions count:', unreadMissions.length);
      setUnreadCount(unreadMissions.length);
    } catch (error) {
      console.error('[UnreadMissions] Error in fetchUnreadMissions:', error);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchUnreadMissions();

    // Subscribe to mission changes
    const missionChannel = supabase
      .channel('mission-updates')
      .on(
        'postgres_changes',
        {
          event: '*',  // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'interpretation_missions',
          filter: `status=eq.awaiting_acceptance`
        },
        () => {
          console.log('[UnreadMissions] Missions table changed, refreshing count');
          fetchUnreadMissions();
        }
      )
      .subscribe((status) => {
        console.log('[UnreadMissions] Mission subscription status:', status);
      });

    // Subscribe to notification changes
    const notificationChannel = supabase
      .channel('notification-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mission_notifications'
        },
        () => {
          console.log('[UnreadMissions] Mission notifications changed, refreshing count');
          fetchUnreadMissions();
        }
      )
      .subscribe((status) => {
        console.log('[UnreadMissions] Notification subscription status:', status);
      });

    return () => {
      supabase.removeChannel(missionChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, []);

  return { unreadCount, refreshUnreadMissions: fetchUnreadMissions };
};
