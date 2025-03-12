export type EmploymentStatus = 
  | "salaried_aft" 
  | "salaried_aftcom" 
  | "salaried_planet" 
  | "self_employed" 
  | "permanent_interpreter"
  | "permanent_interpreter_aftcom";

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  languages: {
    source: string;
    target: string;
  }[];
  employment_status: EmploymentStatus;
  status: "available" | "busy" | "pause" | "unavailable";
  address: {
    street: string;
    postal_code: string;
    city: string;
  } | null;
  birth_country: string | null;
  nationality: string | null;
  siret_number: string | null;
  vat_number: string | null;
  profile_picture_url: string | null;
  password_changed: boolean;
  tarif_5min: number;
  tarif_15min: number;
  specializations: string[];
  landline_phone: string | null;
  booth_number: string | null;
  private_phone: string | null;
  professional_phone: string | null;
  work_hours: {
    start_morning: string;
    end_morning: string;
    start_afternoon: string;
    end_afternoon: string;
  } | null;
}

