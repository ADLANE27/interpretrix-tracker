
export type PrivateReservationStatus = 'scheduled' | 'completed' | 'cancelled';

export interface PrivateReservation {
  id: string;
  interpreter_id: string;
  source_language: string;
  target_language: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  commentary?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: PrivateReservationStatus;
}
