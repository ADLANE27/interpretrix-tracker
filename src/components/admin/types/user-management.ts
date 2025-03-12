
import { Profile } from "@/types/profile";

export interface UserData extends Partial<Profile> {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  active: boolean;
}

