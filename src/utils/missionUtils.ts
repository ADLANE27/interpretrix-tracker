import { format, isWithinInterval, areIntervalsOverlapping, addMinutes, parseISO } from 'date-fns';

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
    // Parse dates and validate them
    const start1 = parseISO(startTime1);
    const end1 = parseISO(endTime1);
    const start2 = parseISO(startTime2);
    const end2 = parseISO(endTime2);

    // Additional validation for date objects
    if ([start1, end1, start2, end2].some(date => isNaN(date.getTime()))) {
      console.error('[missionUtils] Invalid date detected in overlap check');
      return true; // Safer to assume overlap if dates are invalid
    }

    // Validate time order
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
    return true; // Safer to assume overlap if there's an error
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
    // First check if interpreter exists and is available
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

    if (interpreter.status !== 'available') {
      console.log('[missionUtils] Interpreter is not available, status:', interpreter.status);
      return false;
    }

    // Validate input dates
    const missionStart = parseISO(startTime);
    const missionEnd = parseISO(endTime);
    const now = new Date();

    if (isNaN(missionStart.getTime()) || isNaN(missionEnd.getTime())) {
      console.error('[missionUtils] Invalid mission dates');
      return false;
    }

    if (missionStart < now) {
      console.error('[missionUtils] Mission start time is in the past');
      return false;
    }

    if (missionEnd <= missionStart) {
      console.error('[missionUtils] Mission end time is before or equal to start time');
      return false;
    }

    // Check for existing missions
    const { data: existingMissions, error: missionsError } = await supabase
      .from('interpretation_missions')
      .select('scheduled_start_time, scheduled_end_time, mission_type, status')
      .eq('assigned_interpreter_id', interpreterId)
      .in('status', ['accepted', 'in_progress']);

    if (missionsError) {
      console.error('[missionUtils] Error checking existing missions:', missionsError);
      return false;
    }

    // Check immediate missions that might be in progress
    const hasImmediateMissionConflict = existingMissions?.some(mission => {
      if (mission.mission_type !== 'immediate' || mission.status !== 'in_progress') {
        return false;
      }

      const missionEndTime = addMinutes(now, 30); // Assuming immediate missions block 30 minutes
      return isWithinInterval(missionStart, { start: now, end: missionEndTime });
    });

    if (hasImmediateMissionConflict) {
      console.log('[missionUtils] Conflict with immediate mission detected');
      return false;
    }

    // Check scheduled missions
    const hasScheduledMissionConflict = existingMissions?.some(mission => {
      if (mission.mission_type !== 'scheduled' || !mission.scheduled_start_time || !mission.scheduled_end_time) {
        return false;
      }

      return hasTimeOverlap(
        mission.scheduled_start_time,
        mission.scheduled_end_time,
        startTime,
        endTime
      );
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

    // Check if interpreter has any scheduled missions starting soon
    const hasUpcomingMission = scheduledMissions.some(mission => {
      if (!mission?.scheduled_start_time) {
        return false;
      }

      try {
        const missionStart = parseISO(mission.scheduled_start_time);
        
        if (isNaN(missionStart.getTime())) {
          console.error('[missionUtils] Invalid mission start time detected');
          return true; // Safer to assume conflict if date is invalid
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
        return true; // Safer to assume conflict if there's an error
      }
    });

    console.log('[missionUtils] Immediate mission availability result:', !hasUpcomingMission);
    return !hasUpcomingMission;
  } catch (error) {
    console.error('[missionUtils] Error checking immediate mission availability:', error);
    return false;
  }
};