
export interface Profile {
  id: string;
  user_id?: string;
  name?: string;
  full_name?: string;
  status: 'available' | 'busy' | 'pause' | 'unavailable';
  avatar_url?: string;
  languages?: string[];
  specializations?: string[];
  job_title?: string;
  created_at?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  };
  certifications?: string[];
  employment_status?: string;
  availability_schedule?: {
    [key: string]: {
      start: string;
      end: string;
    };
  };
}

export interface ProfileWithUser extends Profile {
  user: {
    email: string;
    role?: string;
  };
}
