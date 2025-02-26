
export interface UserData {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  active: boolean;
}

export interface UsersData {
  admins: UserData[];
  interpreters: UserData[];
}
