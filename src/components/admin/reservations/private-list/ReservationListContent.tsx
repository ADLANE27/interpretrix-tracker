
import { ReservationCard } from "./ReservationCard";
import { EmptyReservationList } from "./EmptyReservationList";
import { PrivateReservation } from "@/types/privateReservation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ReservationListContentProps {
  reservations: PrivateReservation[];
  isLoading: boolean;
  onEdit: (reservation: PrivateReservation) => void;
  onDelete: (reservationId: string) => void;
}

export const ReservationListContent = ({ 
  reservations, 
  isLoading,
  onEdit,
  onDelete
}: ReservationListContentProps) => {
  if (isLoading) {
    return (
      <div className="text-center py-4">
        <LoadingSpinner size="md" text="Chargement des réservations..." />
      </div>
    );
  }

  if (reservations.length === 0) {
    return <EmptyReservationList />;
  }

  return (
    <div className="grid gap-4">
      {reservations.map((reservation) => (
        <ReservationCard
          key={reservation.id}
          reservation={reservation}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
