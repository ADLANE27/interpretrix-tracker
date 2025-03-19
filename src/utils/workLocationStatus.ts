
export type WorkLocation = "remote" | "on_site";

export const workLocationLabels: Record<WorkLocation, string> = {
  remote: "Télétravail",
  on_site: "Sur site",
};

export const getWorkLocationLabel = (location: WorkLocation): string => {
  return workLocationLabels[location] || location;
};

// Returns work location options for select inputs
export const getWorkLocationOptions = () => {
  return Object.entries(workLocationLabels).map(([value, label]) => ({
    value: value as WorkLocation,
    label
  }));
};
