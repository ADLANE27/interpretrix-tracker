
import React from "react";
import { StatusFilter } from "@/components/StatusFilter";
import { Button } from "@/components/ui/button";
import { Grid, LayoutGrid } from "lucide-react";

interface InterpreterFilterBarProps {
  selectedStatus: string | null;
  onStatusChange: (status: string | null) => void;
  viewMode?: "grid" | "list";
  setViewMode?: (mode: "grid" | "list") => void;
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
      
      {viewMode !== undefined && setViewMode !== undefined && (
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
            className="h-8 w-8"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
            className="h-8 w-8"
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
