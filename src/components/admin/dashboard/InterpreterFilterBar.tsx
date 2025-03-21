
import React from "react";
import { StatusFilter } from "@/components/StatusFilter";
import { Button } from "@/components/ui/button";
import { List, LayoutGrid } from "lucide-react";

interface InterpreterFilterBarProps {
  selectedStatus: string | null;
  onStatusChange: (status: string | null) => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
}

export const InterpreterFilterBar: React.FC<InterpreterFilterBarProps> = ({
  selectedStatus,
  onStatusChange,
  viewMode,
  setViewMode,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex-1 w-full sm:w-auto flex justify-center">
        <StatusFilter selectedStatus={selectedStatus} onStatusChange={onStatusChange} />
      </div>
      <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")} className="gap-2">
        {viewMode === "grid" ? (
          <>
            <List className="h-4 w-4" />
            Vue compacte
          </>
        ) : (
          <>
            <LayoutGrid className="h-4 w-4" />
            Vue détaillée
          </>
        )}
      </Button>
    </div>
  );
};
