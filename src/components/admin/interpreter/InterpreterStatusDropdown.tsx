
import { useState, useEffect } from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Status } from "./types/status-types";
import { statusConfig } from "./config/status-config";
import { useStatusDropdown } from "./hooks/useStatusDropdown";
import { StatusTrigger } from "./StatusTrigger";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle } from "lucide-react";

interface InterpreterStatusDropdownProps {
  interpreterId: string;
  currentStatus: Status;
  className?: string;
  displayFormat?: "badge" | "button";
  onStatusChange?: (newStatus: Status) => void;
}

export const InterpreterStatusDropdown = ({ 
  interpreterId, 
  currentStatus, 
  className = "", 
  displayFormat = "badge",
  onStatusChange
}: InterpreterStatusDropdownProps) => {
  const {
    isOpen,
    setIsOpen,
    localStatus,
    pendingStatus,
    isConfirmDialogOpen,
    isUpdating,
    isConnected,
    handleStatusSelect,
    handleConfirm,
    handleCancel,
    retryConnection
  } = useStatusDropdown(interpreterId, currentStatus, onStatusChange);

  const [hasConnectionError, setHasConnectionError] = useState(false);
  const [animating, setAnimating] = useState(false);
  
  // Track ongoing connection issues
  useEffect(() => {
    if (!isConnected) {
      // Only show error after a short delay to avoid flickering during reconnection attempts
      const timer = setTimeout(() => {
        setHasConnectionError(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      setHasConnectionError(false);
    }
  }, [isConnected]);
  
  // Animation handler for status changes
  useEffect(() => {
    if (animating) return;
    
    // Trigger animation on status change
    setAnimating(true);
    const timer = setTimeout(() => {
      setAnimating(false);
    }, 750); // Animation duration
    
    return () => clearTimeout(timer);
  }, [localStatus]);
  
  // Force a connection retry if needed
  const handleForceRetry = () => {
    retryConnection();
  };

  return (
    <>
      <DropdownMenu open={isConnected && isOpen} onOpenChange={isConnected ? setIsOpen : undefined}>
        <DropdownMenuTrigger asChild disabled={!isConnected || isUpdating}>
          <div>
            {hasConnectionError ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative inline-block">
                      <StatusTrigger 
                        displayFormat={displayFormat}
                        statusConfig={statusConfig[localStatus]}
                        status={localStatus}
                        className={className}
                        disabled={!isConnected || isUpdating}
                        isConnected={isConnected}
                        onClick={handleForceRetry}
                        isAnimating={animating}
                      />
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-red-50 border-red-200 text-red-800">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Problème de connexion</span>
                    </div>
                    <p className="text-xs mt-1">Cliquez pour réessayer</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <StatusTrigger 
                displayFormat={displayFormat}
                statusConfig={statusConfig[localStatus]}
                status={localStatus}
                className={className}
                disabled={!isConnected || isUpdating}
                isConnected={isConnected}
                isAnimating={animating}
              />
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-[180px]">
          {Object.entries(statusConfig).map(([status, config]) => {
            const StatusIcon = config.icon;
            return (
              <DropdownMenuItem 
                key={status}
                onClick={() => handleStatusSelect(status as Status)}
                className={`flex items-center gap-2 ${localStatus === status ? 'bg-muted' : ''}`}
              >
                <StatusIcon className="h-4 w-4" />
                <span>{config.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        title="Modifier le statut de l'interprète"
        description={pendingStatus ? 
          `Êtes-vous sûr de vouloir modifier le statut de cet interprète en "${statusConfig[pendingStatus].label}" ?` : 
          "Êtes-vous sûr de vouloir modifier le statut de cet interprète ?"}
        confirmText="Confirmer"
        cancelText="Annuler"
      />
    </>
  );
};
