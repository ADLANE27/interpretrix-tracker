
import { EmploymentStatus } from "@/utils/employmentStatus";
import { Profile } from "@/types/profile";
import { WorkLocation } from "@/utils/workLocationStatus";

export interface UserData extends Partial<Profile> {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  active: boolean;
  employment_status?: EmploymentStatus;
  work_location?: WorkLocation;
}

export interface UsersData {
  admins: UserData[];
  interpreters: UserData[];
}
