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
    const interval1 = {
      start: parseISO(startTime1),
      end: parseISO(endTime1)
    };
    const interval2 = {
      start: parseISO(startTime2),
      end: parseISO(endTime2)
    };

    // Validate that dates are valid
    if (isNaN(interval1.start.getTime()) || isNaN(interval1.end.getTime()) ||
        isNaN(interval2.start.getTime()) || isNaN(interval2.end.getTime())) {
      console.error('[missionUtils] Invalid date detected in overlap check');
      return true; // Safer to assume overlap if dates are invalid
    }

    const hasOverlap = areIntervalsOverlapping(interval1, interval2);
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
    // First check if interpreter is available in general
    const { data: interpreter, error: interpreterError } = await supabase
      .from('interpreter_profiles')
      .select('status')
      .eq('id', interpreterId)
      .single();

    if (interpreterError || !interpreter) {
      console.error('[missionUtils] Error fetching interpreter:', interpreterError);
      return false;
    }

    if (interpreter.status !== 'available') {
      console.log('[missionUtils] Interpreter is not available, status:', interpreter.status);
      return false;
    }

    // Then check for mission conflicts
    const { data: existingMissions, error: missionsError } = await supabase
      .from('interpretation_missions')
      .select('scheduled_start_time, scheduled_end_time, mission_type, status')
      .eq('assigned_interpreter_id', interpreterId)
      .in('status', ['accepted', 'in_progress'])
      .or('mission_type.eq.scheduled,mission_type.eq.immediate');

    if (missionsError) {
      console.error('[missionUtils] Error checking existing missions:', missionsError);
      return false;
    }

    // Check immediate missions that might be in progress
    const now = new Date();
    const missionStartTime = parseISO(startTime);
    
    const hasImmediateMissionConflict = existingMissions?.some(mission => 
      mission.mission_type === 'immediate' && 
      mission.status === 'in_progress' &&
      isWithinInterval(missionStartTime, {
        start: now,
        end: addMinutes(now, 30) // Assuming immediate missions block 30 minutes
      })
    );

    if (hasImmediateMissionConflict) {
      console.log('[missionUtils] Conflict with immediate mission detected');
      return false;
    }

    // Check scheduled missions
    const hasScheduledMissionConflict = existingMissions?.some(mission => 
      mission.mission_type === 'scheduled' &&
      mission.scheduled_start_time &&
      mission.scheduled_end_time &&
      hasTimeOverlap(
        mission.scheduled_start_time,
        mission.scheduled_end_time,
        startTime,
        endTime
      )
    );

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
    if (interpreter.status !== 'available') {
      console.log('[missionUtils] Interpreter status is not available:', interpreter.status);
      return false;
    }

    const now = new Date();
    const thirtyMinutesFromNow = addMinutes(now, 30);

    // Check if interpreter has any scheduled missions starting soon
    const hasUpcomingMission = scheduledMissions.some(mission => {
      if (!mission.scheduled_start_time) return false;
      
      const missionStart = parseISO(mission.scheduled_start_time);
      
      // Check if mission start time is valid
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
    });

    console.log('[missionUtils] Immediate mission availability result:', !hasUpcomingMission);
    return !hasUpcomingMission;
  } catch (error) {
    console.error('[missionUtils] Error checking immediate mission availability:', error);
    return false;
  }
};