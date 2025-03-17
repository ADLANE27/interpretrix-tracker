
export type EmploymentStatus = "salaried_aft" | "salaried_aftcom" | "salaried_planet" | "self_employed" | "permanent_interpreter" | "permanent_interpreter_aftcom";

export const employmentStatusLabels: Record<EmploymentStatus, string> = {
  salaried_aft: "Salarié AFTrad",
  salaried_aftcom: "Salarié AFTCOM",
  salaried_planet: "Salarié PLANET",
  permanent_interpreter: "Interprète permanent",
  permanent_interpreter_aftcom: "Interprète Permanent AFTcom",
  self_employed: "Externe",
};

export const getEmploymentStatusLabel = (status: EmploymentStatus): string => {
  return employmentStatusLabels[status] || status;
};

// Returns an array of all employment status options for multi-select
export const getEmploymentStatusOptions = () => {
  return Object.entries(employmentStatusLabels).map(([value, label]) => ({
    value: value as EmploymentStatus,
    label
  }));
};
