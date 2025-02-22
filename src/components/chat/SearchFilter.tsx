
import React from 'react';
import { Button } from "@/components/ui/button";

interface SearchFilterProps {
  filters: {
    userId?: string;
    keyword?: string;
    date?: Date;
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
}) => {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder="Search messages..."
        className="px-2 py-1 border rounded"
        value={filters.keyword || ''}
        onChange={(e) => onFiltersChange({ ...filters, keyword: e.target.value })}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearFilters}
      >
        Clear
      </Button>
    </div>
  );
};
