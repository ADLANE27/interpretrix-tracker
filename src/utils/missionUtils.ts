
import { format, isWithinInterval, areIntervalsOverlapping, addMinutes } from 'date-fns';

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
    const start1 = new Date(startTime1);
    const end1 = new Date(endTime1);
    const start2 = new Date(startTime2);
    const end2 = new Date(endTime2);

    if ([start1, end1, start2, end2].some(date => isNaN(date.getTime()))) {
      console.error('[missionUtils] Invalid date detected in overlap check');
      return true;
    }

    if (end1 <= start1 || end2 <= start2) {
      console.error('[missionUtils] End time is before or equal to start time');
      return true;
    }

    const hasOverlap = areIntervalsOverlapping(
      { start: start1, end: end1 },
      { start: start2, end: end2 }
    );

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
    const { data: interpreter, error: interpreterError } = await supabase
      .from('interpreter_profiles')
      .select('status, first_name, last_name')
      .eq('id', interpreterId)
      .single();

    if (interpreterError) {
      console.error('[missionUtils] Error fetching interpreter:', interpreterError);
      return false;
    }

    if (!interpreter) {
      console.error('[missionUtils] Interpreter not found');
      return false;
    }

    const missionStart = new Date(startTime);
    const missionEnd = new Date(endTime);
    const now = new Date();

    if (isNaN(missionStart.getTime()) || isNaN(missionEnd.getTime())) {
      console.error('[missionUtils] Invalid mission dates');
      return false;
    }

    // Only check if the date part is in the past, not the time
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const missionDate = new Date(missionStart.getFullYear(), missionStart.getMonth(), missionStart.getDate());

    if (missionDate < todayStart) {
      console.error('[missionUtils] Mission date is in the past');
      return false;
    }

    if (missionEnd <= missionStart) {
      console.error('[missionUtils] Mission end time is before or equal to start time');
      return false;
    }

    const { data: existingMissions, error: missionsError } = await supabase
      .from('interpretation_missions')
      .select('scheduled_start_time, scheduled_end_time, mission_type, status')
      .eq('assigned_interpreter_id', interpreterId)
      .in('status', ['accepted', 'in_progress'])
      .neq('status', 'deleted'); // Add this line to exclude deleted missions

    if (missionsError) {
      console.error('[missionUtils] Error checking existing missions:', missionsError);
      return false;
    }

    const hasScheduledMissionConflict = existingMissions?.some(mission => {
      if (mission.mission_type !== 'scheduled' || !mission.scheduled_start_time || !mission.scheduled_end_time) {
        return false;
      }

      // Log the missions being compared for debugging
      console.log('[missionUtils] Comparing with existing mission:', {
        existingMission: {
          start: mission.scheduled_start_time,
          end: mission.scheduled_end_time
        },
        newMission: {
          start: startTime,
          end: endTime
        }
      });

      const overlap = hasTimeOverlap(
        mission.scheduled_start_time,
        mission.scheduled_end_time,
        startTime,
        endTime
      );

      if (overlap) {
        console.log('[missionUtils] Found overlapping mission:', mission);
      }

      return overlap;
    });

    if (hasScheduledMissionConflict) {
      console.log('[missionUtils] Conflict with scheduled mission detected');
      return false;
    }

    console.log('[missionUtils] Interpreter is available for scheduled mission');
    return true;
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

    const hasUpcomingMission = scheduledMissions.some(mission => {
      if (!mission?.scheduled_start_time) {
        return false;
      }

      try {
        const missionStart = new Date(mission.scheduled_start_time);
        
        if (isNaN(missionStart.getTime())) {
          console.error('[missionUtils] Invalid mission start time detected');
          return true;
        }

        const isConflicting = isWithinInterval(missionStart, {
          start: now,
          end: thirtyMinutesFromNow
        });

        if (isConflicting) {
          console.log('[missionUtils] Upcoming mission conflict detected');
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
