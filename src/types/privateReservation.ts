
export type PrivateReservationStatus = 'scheduled' | 'completed' | 'cancelled';

interface InterpreterProfile {
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
}

export type CompanyType = 'AFTcom' | 'AFTrad';

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
  company: CompanyType;
  interpreter_profiles?: InterpreterProfile;
}
