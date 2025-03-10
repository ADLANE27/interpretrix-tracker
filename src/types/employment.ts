
export type EmploymentStatus = 
  | "salaried_aft"
  | "salaried_aftcom"
  | "salaried_planet"
  | "self_employed"
  | "permanent_interpreter"
  | "permanent_interpreter_aftcom";

export const employmentStatusLabels: Record<EmploymentStatus, string> = {
  salaried_aft: "Salarié AFTrad",
  salaried_aftcom: "Salarié AFTCOM",
  salaried_planet: "Salarié PLANET",
  self_employed: "Externe",
  permanent_interpreter: "Interprète permanent",
  permanent_interpreter_aftcom: "Interprète Permanent AFTcom"
};

