
import { useState } from "react";
import { PrivateReservation } from "@/types/privateReservation";
import { ReservationEditDialog } from "./ReservationEditDialog";
import { ReservationListContent } from "./private-list/ReservationListContent";
import { useReservations } from "./private-list/useReservations";
import { useMissionUpdates } from "@/hooks/useMissionUpdates";

interface PrivateReservationListProps {
  nameFilter: string;
  sourceLanguageFilter: string;
  targetLanguageFilter: string;
  startDateFilter: string;
  endDateFilter: string;
  companyFilter: string;
}

export const PrivateReservationList = ({
  nameFilter,
  sourceLanguageFilter,
  targetLanguageFilter,
  startDateFilter,
  endDateFilter,
  companyFilter
}: PrivateReservationListProps) => {
  const [selectedReservation, setSelectedReservation] = useState<PrivateReservation | null>(null);
  
  const { 
    reservations, 
    isLoading, 
    fetchReservations, 
    handleDeleteReservation 
  } = useReservations({
    nameFilter,
    sourceLanguageFilter,
    targetLanguageFilter,
    startDateFilter,
    endDateFilter,
    companyFilter
  });

  useMissionUpdates(() => {
    console.log('[PrivateReservationList] Received update, refreshing reservations');
    fetchReservations();
  });

  const onClose = () => setSelectedReservation(null);

  const handleReservationUpdate = () => {
    fetchReservations();
    onClose();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Réservations privées</h2>

      <ReservationListContent
        reservations={reservations}
        isLoading={isLoading}
        onEdit={setSelectedReservation}
        onDelete={handleDeleteReservation}
      />

      {selectedReservation && (
        <ReservationEditDialog
          reservation={selectedReservation}
          onClose={onClose}
          onSuccess={handleReservationUpdate}
        />
      )}
    </div>
  );
};
