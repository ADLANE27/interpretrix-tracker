
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PrivateReservation } from "@/types/privateReservation";
import { ReservationEditDialog } from "./ReservationEditDialog";
import { formatDateTimeDisplay } from "@/utils/dateTimeUtils";
import { Clock, Languages, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PrivateReservationListProps {
  nameFilter: string;
  sourceLanguageFilter: string;
  targetLanguageFilter: string;
  startDateFilter: string;
  endDateFilter: string;
}

export const PrivateReservationList = ({
  nameFilter,
  sourceLanguageFilter,
  targetLanguageFilter,
  startDateFilter,
  endDateFilter
}: PrivateReservationListProps) => {
  const [reservations, setReservations] = useState<PrivateReservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<PrivateReservation | null>(null);
  const { toast } = useToast();

  const fetchReservations = async () => {
    try {
      let query = supabase
        .from('private_reservations')
        .select(`
          *,
          interpreter_profiles (
            first_name,
            last_name,
            profile_picture_url
          )
        `)
        .order('start_time', { ascending: true });

      // Apply filters
      if (nameFilter) {
        query = query.or(`interpreter_profiles.first_name.ilike.%${nameFilter}%,interpreter_profiles.last_name.ilike.%${nameFilter}%`);
      }

      if (sourceLanguageFilter !== 'all') {
        query = query.eq('source_language', sourceLanguageFilter);
      }

      if (targetLanguageFilter !== 'all') {
        query = query.eq('target_language', targetLanguageFilter);
      }

      if (startDateFilter) {
        query = query.gte('start_time', `${startDateFilter}T00:00:00`);
      }

      if (endDateFilter) {
        query = query.lte('start_time', `${endDateFilter}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error('[PrivateReservationList] Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les réservations",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    console.log('[PrivateReservationList] Setting up realtime subscriptions');
    
    fetchReservations();

    // Subscribe to ALL changes on private_reservations
    const channel = supabase
      .channel('private-reservations-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_reservations'
        },
        (payload) => {
          console.log('[PrivateReservationList] Received reservation update:', payload);
          fetchReservations();
        }
      )
      .subscribe((status) => {
        console.log('[PrivateReservationList] Subscription status:', status);
      });

    return () => {
      console.log('[PrivateReservationList] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [nameFilter, sourceLanguageFilter, targetLanguageFilter, startDateFilter, endDateFilter]);

  const onClose = () => setSelectedReservation(null);

  const handleReservationUpdate = () => {
    fetchReservations();
    onClose();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Réservations privées</h2>

      <div className="grid gap-4">
        {reservations.length === 0 ? (
          <p className="text-muted-foreground">Aucune réservation privée</p>
        ) : (
          reservations.map((reservation) => (
            <Card key={reservation.id} className="p-4">
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
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setSelectedReservation(reservation)}
                  >
                    Modifier
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

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
