import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, addMinutes, formatISO } from "date-fns";
import { fromZonedTime } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "@radix-ui/react-icons"
import { Listbox } from '@headlessui/react'

type Mission = {
  id: string;
  source_language: string;
  target_language: string;
  estimated_duration: number;
  status: string;
  created_at: string;
};

type Interpreter = {
  id: string;
  email: string;
};

const languages = [
  { label: "Français", value: "fr" },
  { label: "Anglais", value: "en" },
  { label: "Espagnol", value: "es" },
  { label: "Allemand", value: "de" },
  { label: "Italien", value: "it" },
];

export function MissionManagement() {
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [interpreters, setInterpreters] = useState<Interpreter[]>([]);
  const [selectedInterpreters, setSelectedInterpreters] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [missionType, setMissionType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledStartTime, setScheduledStartTime] = useState<Date | null>(null);
  const [scheduledEndTime, setScheduledEndTime] = useState<Date | null>(null);
  const [showDateSelection, setShowDateSelection] = useState(false);

  useEffect(() => {
    fetchMissions();
    fetchInterpreters();
  }, []);

  const fetchMissions = async () => {
    try {
      const { data, error } = await supabase
        .from("interpretation_missions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMissions(data || []);
    } catch (error) {
      console.error("Error fetching missions:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les missions",
        variant: "destructive",
      });
    }
  };

  const fetchInterpreters = async () => {
    try {
      const { data, error } = await supabase
        .from("interpreters")
        .select("id, email");

      if (error) throw error;
      setInterpreters(data || []);
    } catch (error) {
      console.error("Error fetching interpreters:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les interprètes",
        variant: "destructive",
      });
    }
  };

  const createMission = async () => {
    try {
      setIsSubmitting(true);

      if (!sourceLanguage || !targetLanguage || !selectedInterpreters.length) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive",
        });
        return;
      }

      // Calculate notification expiry (15 minutes from now)
      const notificationExpiry = addMinutes(new Date(), 15);

      // Calculate duration and handle timezone conversion for scheduled missions
      let calculatedDuration = estimatedDuration;
      let utcStartTime = null;
      let utcEndTime = null;

      if (missionType === 'scheduled' && scheduledStartTime && scheduledEndTime) {
        utcStartTime = formatISO(fromZonedTime(scheduledStartTime, Intl.DateTimeFormat().resolvedOptions().timeZone));
        utcEndTime = formatISO(fromZonedTime(scheduledEndTime, Intl.DateTimeFormat().resolvedOptions().timeZone));
        calculatedDuration = Math.round(
          (new Date(scheduledEndTime).getTime() - new Date(scheduledStartTime).getTime()) / 1000 / 60
        );
      }

      if (missionType === 'immediate' && !calculatedDuration) {
        throw new Error('Duration is required for immediate missions');
      }

      console.log('[MissionManagement] Creating mission for interpreters:', selectedInterpreters);

      const { data: createdMission, error: missionError } = await supabase
        .from("interpretation_missions")
        .insert({
          source_language: sourceLanguage,
          target_language: targetLanguage,
          estimated_duration: calculatedDuration,
          status: "awaiting_acceptance",
          notification_expiry: notificationExpiry.toISOString(),
          notified_interpreters: selectedInterpreters,
          mission_type: missionType,
          scheduled_start_time: utcStartTime,
          scheduled_end_time: utcEndTime
        })
        .select()
        .single();

      if (missionError) throw missionError;

      console.log('[MissionManagement] Mission created successfully:', createdMission);

      // Create notifications for each selected interpreter
      const notifications = selectedInterpreters.map(interpreter => ({
        mission_id: createdMission.id,
        interpreter_id: interpreter,
        status: "pending"
      }));

      const { error: notificationError } = await supabase
        .from("mission_notifications")
        .insert(notifications);

      if (notificationError) throw notificationError;

      console.log('[MissionManagement] Notifications created successfully for interpreters:', selectedInterpreters);
      
      setSourceLanguage("");
      setTargetLanguage("");
      setSelectedInterpreters([]);
      setEstimatedDuration(0);
      setMissionType("immediate");
      setScheduledStartTime(null);
      setScheduledEndTime(null);
      setShowDateSelection(false);

      toast({
        title: "Mission créée avec succès",
        description: `La mission ${missionType === 'scheduled' ? 'programmée' : 'immédiate'} a été créée et les interprètes ont été notifiés`,
      });

      fetchMissions();

    } catch (error) {
      console.error('[MissionManagement] Error creating mission:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création de la mission",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <Card>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sourceLanguage">Langue source</Label>
              <Select onValueChange={setSourceLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une langue" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="targetLanguage">Langue cible</Label>
              <Select onValueChange={setTargetLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une langue" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="missionType">Type de mission</Label>
              <Select onValueChange={(value) => {
                setMissionType(value as 'immediate' | 'scheduled');
                setShowDateSelection(value === 'scheduled');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immédiate</SelectItem>
                  <SelectItem value="scheduled">Programmée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showDateSelection && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Date de début</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[280px] justify-start text-left font-normal",
                          !scheduledStartTime && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledStartTime ? format(scheduledStartTime, "PPP p") : <span>Choisir une date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center" side="bottom">
                      <Calendar
                        mode="single"
                        selected={scheduledStartTime}
                        onSelect={setScheduledStartTime}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Date de fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[280px] justify-start text-left font-normal",
                          !scheduledEndTime && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledEndTime ? format(scheduledEndTime, "PPP p") : <span>Choisir une date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center" side="bottom">
                      <Calendar
                        mode="single"
                        selected={scheduledEndTime}
                        onSelect={setScheduledEndTime}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {missionType === 'immediate' && (
              <div>
                <Label htmlFor="estimatedDuration">Durée estimée (minutes)</Label>
                <Input
                  type="number"
                  id="estimatedDuration"
                  value={estimatedDuration.toString()}
                  onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="interpreters">Interprètes</Label>
            <Listbox value={selectedInterpreters} onChange={setSelectedInterpreters} multiple>
              <div className="relative mt-1">
                <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                  <span className="block truncate">
                    {selectedInterpreters.length > 0
                      ? `${selectedInterpreters.length} interprètes sélectionnés`
                      : 'Sélectionner des interprètes'}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 3a1.5 1.5 0 01.354.354l5.293 5.293a1.5 1.5 0 11-2.122 2.122L10 6.414l-3.536 3.536a1.5 1.5 0 11-2.122-2.122L9.646 3.354A1.5 1.5 0 0110 3z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M10 17a1.5 1.5 0 01-.354-.354l-5.293-5.293a1.5 1.5 0 112.122-2.122L10 13.586l3.536-3.536a1.5 1.5 0 112.122 2.122l-5.293 5.293A1.5 1.5 0 0110 17z" clipRule="evenodd" />
                    </svg>
                  </span>
                </Listbox.Button>
                <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {interpreters.map((person, personIdx) => (
                    <Listbox.Option
                      key={personIdx}
                      className={({ active }) =>
                        cn(
                          'relative cursor-default select-none py-2 pl-10 pr-4',
                          active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                        )
                      }
                      value={person.id}
                    >
                      {({ selected }) => (
                        <>
                          <span className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}>
                            {person.email}
                          </span>
                          {selected ? (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.144 1.052l-8.026 8.025a.75.75 0 01-1.065.021L3.217 8.384a.75.75 0 111.03-1.096l3.908 4.431a.75.75 0 011.08-.04l7.297-8.25a.75.75 0 011.052-.146z" clipRule="evenodd" />
                              </svg>
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>
          </div>

          <Button disabled={isSubmitting} onClick={createMission}>
            {isSubmitting ? "Création en cours..." : "Créer une mission"}
          </Button>
        </div>
      </Card>

      <Card>
        <h2>Missions existantes</h2>
        {missions.map((mission) => (
          <div key={mission.id}>
            {mission.source_language} vers {mission.target_language} - Durée:{" "}
            {mission.estimated_duration} minutes - Statut: {mission.status}
          </div>
        ))}
      </Card>
    </Card>
  );
}
