
import React from "react";
import { StatusFilter } from "@/components/StatusFilter";

interface InterpreterFilterBarProps {
  selectedStatus: string | null;
  onStatusChange: (status: string | null) => void;
}

export const InterpreterFilterBar: React.FC<InterpreterFilterBarProps> = ({
  selectedStatus,
  onStatusChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      <div className="flex-1 w-full sm:w-auto flex justify-center">
        <StatusFilter selectedStatus={selectedStatus} onStatusChange={onStatusChange} />
      </div>
    </div>
  );
};
