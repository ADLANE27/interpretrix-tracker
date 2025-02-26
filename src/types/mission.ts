
export interface Mission {
  id: string;
  client_name: string | null;
  source_language: string;
  target_language: string;
  estimated_duration: number;
  status: string;
  created_at: string;
  assigned_interpreter_id: string | null;
  assignment_time: string | null;
  mission_type: 'immediate' | 'scheduled';
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  creator_email?: string;
  creator_first_name?: string;
  creator_last_name?: string;
  notified_interpreters?: string[];
  is_private_reservation?: boolean;
}
