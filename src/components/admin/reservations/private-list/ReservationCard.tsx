
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Languages, User, Building } from "lucide-react";
import { PrivateReservation, CompanyType } from "@/types/privateReservation";
import { formatDateTimeDisplay } from "@/utils/dateTimeUtils";
import { COMPANY_TYPES } from "@/lib/constants";

interface ReservationCardProps {
  reservation: PrivateReservation;
  onEdit: (reservation: PrivateReservation) => void;
  onDelete: (reservationId: string) => void;
}

export const ReservationCard = ({ reservation, onEdit, onDelete }: ReservationCardProps) => {
  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="font-medium">
                {formatDateTimeDisplay(reservation.start_time)}
              </span>
              <Badge variant="outline">
                {reservation.duration_minutes} min
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-green-500" />
              <span>
                {reservation.source_language} → {reservation.target_language}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-purple-500" />
              <span>
                {reservation.interpreter_profiles?.first_name}{' '}
                {reservation.interpreter_profiles?.last_name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-amber-500" />
              <Badge variant={reservation.company === COMPANY_TYPES.AFTCOM ? "secondary" : "default"}>
                {reservation.company}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onEdit(reservation)}
            >
              Modifier
            </Button>
            <Button
              variant="destructive"
              onClick={() => onDelete(reservation.id)}
            >
              Supprimer
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
