
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

// Utility function to filter an array of interpreters by multiple employment statuses
export const filterByEmploymentStatuses = (
  interpreters: any[], 
  selectedStatuses: EmploymentStatus[]
): any[] => {
  // If no statuses are selected, return all interpreters
  if (!selectedStatuses.length) return interpreters;
  
  // Filter interpreters that match any of the selected statuses
  return interpreters.filter(interpreter => 
    selectedStatuses.includes(interpreter.employment_status as EmploymentStatus)
  );
};
