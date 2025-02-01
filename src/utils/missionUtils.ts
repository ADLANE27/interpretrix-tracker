import { format, isWithinInterval, areIntervalsOverlapping } from 'date-fns';

export const hasTimeOverlap = (
  startTime1: string,
  endTime1: string,
  startTime2: string,
  endTime2: string
): boolean => {
  const interval1 = {
    start: new Date(startTime1),
    end: new Date(endTime1)
  };
  const interval2 = {
    start: new Date(startTime2),
    end: new Date(endTime2)
  };
  return areIntervalsOverlapping(interval1, interval2);
};

export const isInterpreterAvailableForScheduledMission = async (
  interpreterId: string,
  startTime: string,
  endTime: string,
  supabase: any
): Promise<boolean> => {
  // Get interpreter's accepted scheduled missions
  const { data: existingMissions, error } = await supabase
    .from('interpretation_missions')
    .select('scheduled_start_time, scheduled_end_time')
    .eq('assigned_interpreter_id', interpreterId)
    .eq('status', 'accepted')
    .eq('mission_type', 'scheduled');

  if (error) {
    console.error('Error checking interpreter availability:', error);
    return false;
  }

  // Check for any overlaps with existing missions
  return !existingMissions?.some(mission => 
    hasTimeOverlap(
      mission.scheduled_start_time,
      mission.scheduled_end_time,
      startTime,
      endTime
    )
  );
};

export const isInterpreterAvailableForImmediateMission = (
  interpreter: any,
  scheduledMissions: any[]
): boolean => {
  if (interpreter.status !== 'available') {
    return false;
  }

  const now = new Date();
  const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60000);

  // Check if interpreter has any scheduled missions starting in the next 15 minutes
  return !scheduledMissions.some(mission => {
    if (!mission.scheduled_start_time) return false;
    const missionStart = new Date(mission.scheduled_start_time);
    return missionStart >= now && missionStart <= fifteenMinutesFromNow;
  });
};