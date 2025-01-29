import { Database as DatabaseGenerated } from './types.generated'

// Re-export the Database type
export type Database = DatabaseGenerated

// Export commonly used types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Address {
  street: string;
  postal_code: string;
  city: string;
}

export type InterpreterProfile = Database['public']['Tables']['interpreter_profiles']['Row']
export type LanguagePair = {
  source: string;
  target: string;
}

export type EmploymentStatus = Database['public']['Enums']['employment_status']