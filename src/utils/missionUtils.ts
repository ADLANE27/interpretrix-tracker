import { format, isWithinInterval } from 'date-fns';
import { toFrenchTime, hasTimeOverlap as timeOverlap } from './timeZone';

export const hasTimeOverlap = (
  startTime1: string,
  endTime1: string,
  startTime2: string,
  endTime2: string
): boolean => {
  console.log('[missionUtils] Checking time overlap between:', {
    interval1: { start: startTime1, end: endTime1 },
    interval2: { start: startTime2, end: endTime2 }
  });

  try {
    if (!startTime1 || !endTime1 || !startTime2 || !endTime2) {
      console.error('[missionUtils] Invalid dates provided');
      return true;
    }

    const hasOverlap = timeOverlap(startTime1, endTime1, startTime2, endTime2);
    console.log('[missionUtils] Overlap result:', hasOverlap);
    return hasOverlap;
  } catch (error) {
    console.error('[missionUtils] Error in hasTimeOverlap:', error);
    return true;
  }
};

export const isInterpreterAvailableForScheduledMission = async (
  interpreterId: string,
  startTime: string,
  endTime: string,
  supabase: any
): Promise<boolean> => {
  console.log('[missionUtils] Checking interpreter availability for scheduled mission:', {
    interpreterId,
    startTime,
    endTime
  });

  try {
    const { data: existingMissions, error: missionsError } = await supabase
      .from('interpretation_missions')
      .select('id, scheduled_start_time, scheduled_end_time, mission_type, status')
      .eq('assigned_interpreter_id', interpreterId)
      .in('status', ['accepted', 'in_progress']);

    if (missionsError) {
      console.error('[missionUtils] Error checking existing missions:', missionsError);
      return false;
    }

    console.log('[missionUtils] Found existing missions:', existingMissions);

    const hasConflict = existingMissions?.some(mission => {
      if (!mission.scheduled_start_time || !mission.scheduled_end_time) {
        return false;
      }

      const overlap = hasTimeOverlap(
        mission.scheduled_start_time,
        mission.scheduled_end_time,
        startTime,
        endTime
      );

      if (overlap) {
        console.log('[missionUtils] Found conflicting mission:', {
          missionId: mission.id,
          status: mission.status,
          startTime: mission.scheduled_start_time,
          endTime: mission.scheduled_end_time
        });
      }

      return overlap;
    });

    const { data: pendingNotifications, error: notificationsError } = await supabase
      .from('mission_notifications')
      .select(`
        status,
        mission_id,
        interpretation_missions!inner (
          id,
          scheduled_start_time,
          scheduled_end_time,
          status
        )
      `)
      .eq('interpreter_id', interpreterId)
      .eq('status', 'pending');

    if (notificationsError) {
      console.error('[missionUtils] Error checking pending notifications:', notificationsError);
      return !hasConflict;
    }

    console.log('[missionUtils] Found pending notifications:', pendingNotifications);

    const hasPendingConflict = pendingNotifications?.some(notification => {
      const mission = notification.interpretation_missions;
      if (!mission.scheduled_start_time || !mission.scheduled_end_time) {
        return false;
      }

      const overlap = hasTimeOverlap(
        mission.scheduled_start_time,
        mission.scheduled_end_time,
        startTime,
        endTime
      );

      if (overlap) {
        console.log('[missionUtils] Found conflicting pending notification:', {
          missionId: notification.mission_id,
          startTime: mission.scheduled_start_time,
          endTime: mission.scheduled_end_time
        });
      }

      return overlap;
    });

    const isAvailable = !hasConflict && !hasPendingConflict;
    console.log('[missionUtils] Final availability check result:', {
      isAvailable,
      hasExistingConflict: hasConflict,
      hasPendingConflict
    });

    return isAvailable;
  } catch (error) {
    console.error('[missionUtils] Error in availability check:', error);
    return false;
  }
};

export const isInterpreterAvailableForImmediateMission = (
  interpreter: any,
  scheduledMissions: any[]
): boolean => {
  console.log('[missionUtils] Checking interpreter availability for immediate mission');

  try {
    if (!interpreter || !interpreter.status) {
      console.error('[missionUtils] Invalid interpreter data');
      return false;
    }

    if (interpreter.status !== 'available') {
      console.log('[missionUtils] Interpreter status is not available:', interpreter.status);
      return false;
    }

    const now = new Date();
    const thirtyMinutesFromNow = addMinutes(now, 30);

    const activeScheduledMissions = scheduledMissions.filter(
      mission => mission?.status !== 'deleted'
    );

    const hasUpcomingMission = activeScheduledMissions.some(mission => {
      if (!mission?.scheduled_start_time) {
        return false;
      }

      try {
        const missionStart = toFrenchTime(mission.scheduled_start_time);
        
        if (isNaN(missionStart.getTime())) {
          console.error('[missionUtils] Invalid mission start time detected');
          return true;
        }

        const isConflicting = isWithinInterval(missionStart, {
          start: now,
          end: thirtyMinutesFromNow
        });

        if (isConflicting) {
          console.log('[missionUtils] Upcoming mission conflict detected:', {
            missionId: mission.id,
            startTime: mission.scheduled_start_time,
            status: mission.status
          });
        }

        return isConflicting;
      } catch (error) {
        console.error('[missionUtils] Error processing mission:', error);
        return true;
      }
    });

    console.log('[missionUtils] Immediate mission availability result:', !hasUpcomingMission);
    return !hasUpcomingMission;
  } catch (error) {
    console.error('[missionUtils] Error checking immediate mission availability:', error);
    return false;
  }
};
