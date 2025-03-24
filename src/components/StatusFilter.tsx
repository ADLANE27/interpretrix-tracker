import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { getStatusConfig } from '@/utils/statusConfig';
import { Status } from '@/components/interpreter/StatusButton';

interface StatusFilterProps {
  selectedStatus: string | null;
  onStatusChange: (status: string | null) => void;
}

export const StatusFilter = ({ selectedStatus, onStatusChange }: StatusFilterProps) => {
  const isMobile = useIsMobile();
  const statusConfig = getStatusConfig();
  const statuses = Object.keys(statusConfig) as Status[];

  const handleStatusClick = (statusId: string) => {
    // If clicking the already selected status, deselect it
    if (selectedStatus === statusId) {
      onStatusChange(null);
    } else {
      // Otherwise, select the new status
      onStatusChange(statusId);
    }
  };

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {statuses.map((statusId) => {
        const config = statusConfig[statusId];
        const Icon = config.icon;
        return (
          <Button
            key={statusId}
            variant={selectedStatus === statusId ? "default" : "outline"}
            className={`
              transition-all duration-200 rounded-full h-10 
              ${isMobile ? 'px-2 text-xs' : 'px-4 text-sm'}
              ${selectedStatus === statusId 
                ? `bg-gradient-to-r ${config.color} text-white shadow-md` 
                : 'hover:bg-slate-100 dark:hover:bg-slate-800'}
            `}
            onClick={() => handleStatusClick(statusId)}
          >
            <Icon className={`${isMobile ? 'h-3 w-3 mr-0.5' : 'h-3.5 w-3.5 mr-1'} min-w-[12px] flex-shrink-0`} />
            <span className="truncate whitespace-nowrap">
              {isMobile ? config.mobileLabel : config.label}
            </span>
          </Button>
        )}
      )}
    </div>
  );
};
