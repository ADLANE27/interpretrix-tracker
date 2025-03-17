
import { useState } from "react";
import { EmploymentStatus } from "@/utils/employmentStatus";
import { EmploymentStatusMultiSelect } from "./EmploymentStatusMultiSelect";

export const EmploymentStatusFilterDemo = () => {
  const [selectedStatuses, setSelectedStatuses] = useState<EmploymentStatus[]>([]);

  return (
    <div className="space-y-4 p-4 border rounded-md">
      <h3 className="text-lg font-medium">Filtrer par statut professionnel</h3>
      <EmploymentStatusMultiSelect 
        selectedStatuses={selectedStatuses}
        onChange={setSelectedStatuses}
      />
      
      <div className="mt-4">
        <p>Statuts sélectionnés:</p>
        <ul>
          {selectedStatuses.length > 0 ? (
            selectedStatuses.map(status => (
              <li key={status}>{status}</li>
            ))
          ) : (
            <li>Aucun statut sélectionné</li>
          )}
        </ul>
      </div>
    </div>
  );
};
