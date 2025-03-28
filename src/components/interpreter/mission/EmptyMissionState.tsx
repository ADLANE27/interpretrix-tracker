
import { AlertCircle, Box } from "lucide-react";

interface EmptyMissionStateProps {
  type: "all" | "filtered";
}

export const EmptyMissionState = ({ type }: EmptyMissionStateProps) => {
  if (type === "all") {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <Box className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">Aucune mission disponible</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Vous n'avez actuellement aucune mission à traiter.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
      <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">Aucune mission dans cette catégorie</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Consultez les autres onglets pour voir vos missions.
      </p>
    </div>
  );
};
