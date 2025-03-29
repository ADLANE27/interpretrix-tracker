import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/lib/constants";
import { Search } from "lucide-react";
import { InterpreterSuggestionCard } from "@/components/interpreter/mission/InterpreterSuggestionCard";

export const MissionForm = ({ onMissionCreated }: { onMissionCreated: () => void }) => {
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [commentary, setCommentary] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [availableInterpreters, setAvailableInterpreters] = useState<any[]>([]);
  const [selectedInterpreter, setSelectedInterpreter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const [interpreterSearch, setInterpreterSearch] = useState("");
  const [filteredInterpreters, setFilteredInterpreters] = useState<any[]>([]);
  
  const findInterpreters = async (sourceLang: string, targetLang: string) => {
    if (!sourceLang || !targetLang) return;

    try {
      const { data: interpreters, error } = await supabase
        .from("interpreter_profiles")
        .select(`
          id,
          first_name,
          last_name,
          status,
          profile_picture_url,
          languages,
          employment_status,
          tarif_5min,
          tarif_15min
        `);

      if (error) {
        console.error("Error fetching interpreters:", error);
        toast({
          title: "Error",
          description: "Failed to fetch available interpreters",
          variant: "destructive",
        });
        return;
      }
      
      if (interpreters && !error) {
        const sortedInterpreters = [...interpreters].sort((a, b) => {
          const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
          const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
        setAvailableInterpreters(sortedInterpreters);
        setFilteredInterpreters(sortedInterpreters);
      }
    } catch (error) {
      console.error("Error fetching interpreters:", error);
      toast({
        title: "Error",
        description: "Failed to fetch available interpreters",
        variant: "destructive",
      });
    }
  };
  
  useEffect(() => {
    if (availableInterpreters.length > 0) {
      if (interpreterSearch.trim() === "") {
        setFilteredInterpreters(availableInterpreters);
        return;
      }

      const query = interpreterSearch.toLowerCase().trim();
      const filtered = availableInterpreters.filter(interpreter => {
        const fullName = `${interpreter.first_name} ${interpreter.last_name}`.toLowerCase();
        return fullName.includes(query);
      });
      
      setFilteredInterpreters(filtered);
    }
  }, [interpreterSearch, availableInterpreters]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceLanguage || !targetLanguage || !startTime || !endTime || !selectedInterpreter) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      const durationInMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

      const { error } = await supabase.from("interpretation_missions").insert([
        {
          source_language: sourceLanguage,
          target_language: targetLanguage,
          commentary,
          scheduled_start_time: startTime,
          scheduled_end_time: endTime,
          assigned_interpreter_id: selectedInterpreter,
          created_by: user.id,
          estimated_duration: durationInMinutes,
          mission_type: 'scheduled',
          status: 'scheduled'
        },
      ]);

      if (error) {
        console.error("Error creating mission:", error);
        toast({
          title: "Error",
          description: "Failed to create mission.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Mission created successfully!",
      });

      setSourceLanguage("");
      setTargetLanguage("");
      setCommentary("");
      setStartTime("");
      setEndTime("");
      setSelectedInterpreter(null);

      if (onMissionCreated) {
        onMissionCreated();
      }
    } catch (error) {
      console.error("Error creating mission:", error);
      toast({
        title: "Error",
        description: "Failed to create mission.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Create Mission</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="sourceLanguage">Source Language</Label>
          <Select value={sourceLanguage} onValueChange={(value) => {
            setSourceLanguage(value);
            findInterpreters(value, targetLanguage);
          }}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="targetLanguage">Target Language</Label>
          <Select value={targetLanguage} onValueChange={(value) => {
            setTargetLanguage(value);
            findInterpreters(sourceLanguage, value);
          }}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="commentary">Commentary</Label>
          <Textarea
            id="commentary"
            value={commentary}
            onChange={(e) => setCommentary(e.target.value)}
            className="bg-background"
          />
        </div>
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            type="datetime-local"
            id="startTime"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="bg-background"
          />
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input
            type="datetime-local"
            id="endTime"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="bg-background"
          />
        </div>
        
        {availableInterpreters.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Sélectionner un interprète</Label>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un interprète..."
                  value={interpreterSearch}
                  onChange={(e) => setInterpreterSearch(e.target.value)}
                  className="pl-8 bg-background"
                />
              </div>
            </div>
            
            {filteredInterpreters.length === 0 ? (
              <div className="text-center p-4 border border-dashed rounded-lg">
                <p className="text-muted-foreground">Aucun interprète ne correspond à votre recherche</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredInterpreters.map(interpreter => (
                  <InterpreterSuggestionCard
                    key={interpreter.id}
                    interpreter={interpreter}
                    isSelected={selectedInterpreter === interpreter.id}
                    onClick={() => setSelectedInterpreter(interpreter.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Creating..." : "Create Mission"}
        </Button>
      </form>
    </Card>
  );
};
