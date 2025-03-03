
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
  employment_status: "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter";
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
}
