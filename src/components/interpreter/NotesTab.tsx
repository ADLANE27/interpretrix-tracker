import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Mic, MicOff, Pause, Play, Save, Trash, Pin, PinOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useTabPersistence } from "@/hooks/useTabPersistence";

interface Note {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  mission_id: string | null;
}

interface Recording {
  id: string;
  note_id: string;
  file_path: string;
  duration: number | null;
  created_at: string;
}

export const NotesTab = () => {
  const { toast } = useToast();
  const { activeTab, setActiveTab } = useTabPersistence('notes', 'all');
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchNotes();
    return () => {
      if (mediaRecorder) {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }
      if (recordingTimer) {
        clearInterval(recordingTimer);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      const { data: notesData, error: notesError } = await supabase
        .from("interpreter_notes")
        .select("*")
        .order("updated_at", { ascending: false });

      if (notesError) throw notesError;

      const pinned = notesData.filter(note => note.is_pinned);
      const unpinned = notesData.filter(note => !note.is_pinned);
      
      setPinnedNotes(pinned);
      setNotes(unpinned);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les notes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecordings = async (noteId: string) => {
    try {
      const { data, error } = await supabase
        .from("note_recordings")
        .select("*")
        .eq("note_id", noteId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecordings(data || []);
      
      return data;
    } catch (error) {
      console.error("Error fetching recordings:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les enregistrements",
        variant: "destructive",
      });
      return [];
    }
  };

  const handleNewNote = () => {
    setCurrentNote(null);
    setNewTitle("");
    setNewContent("");
    setIsEditing(true);
    setRecordings([]);
    setAudioUrl(null);
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }
  };

  const handleEditNote = async (note: Note) => {
    setCurrentNote(note);
    setNewTitle(note.title);
    setNewContent(note.content || "");
    setIsEditing(true);
    await fetchRecordings(note.id);
  };

  const handleSaveNote = async () => {
    try {
      if (!newTitle.trim()) {
        toast({
          title: "Erreur",
          description: "Le titre ne peut pas être vide",
          variant: "destructive",
        });
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté",
          variant: "destructive",
        });
        return;
      }

      if (currentNote) {
        const { data, error } = await supabase
          .from("interpreter_notes")
          .update({
            title: newTitle,
            content: newContent,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentNote.id)
          .select()
          .single();

        if (error) throw error;
        
        if (audioChunks.length > 0) {
          await saveRecording(currentNote.id);
        }

        toast({
          title: "Succès",
          description: "Note mise à jour avec succès",
        });
      } else {
        const { data, error } = await supabase
          .from("interpreter_notes")
          .insert({
            title: newTitle,
            content: newContent,
            interpreter_id: authData.user.id
          })
          .select()
          .single();

        if (error) throw error;
        
        if (audioChunks.length > 0 && data) {
          await saveRecording(data.id);
        }

        toast({
          title: "Succès",
          description: "Note créée avec succès",
        });
      }

      setIsEditing(false);
      resetRecording();
      fetchNotes();
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la note",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from("interpreter_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Note supprimée avec succès",
      });

      fetchNotes();
      if (currentNote?.id === noteId) {
        setIsEditing(false);
        setCurrentNote(null);
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la note",
        variant: "destructive",
      });
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const { data, error } = await supabase
        .from("interpreter_notes")
        .update({
          is_pinned: !note.is_pinned,
          updated_at: new Date().toISOString(),
        })
        .eq("id", note.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: note.is_pinned ? "Note non épinglée" : "Note épinglée",
      });

      fetchNotes();
    } catch (error) {
      console.error("Error toggling pin:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'épingle",
        variant: "destructive",
      });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      
      recorder.onstart = () => {
        setAudioChunks([]);
        setIsRecording(true);
        setIsPaused(false);
        
        const timer = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
        setRecordingTimer(timer);
      };
      
      recorder.ondataavailable = (e) => {
        setAudioChunks(currentChunks => [...currentChunks, e.data]);
      };
      
      recorder.onstop = () => {
        if (recordingTimer) {
          clearInterval(recordingTimer);
          setRecordingTimer(null);
        }
        
        setIsRecording(false);
        
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        const audio = new Audio(url);
        setAudioElement(audio);
      };
      
      recorder.start();
      
      toast({
        title: "Enregistrement en cours",
        description: "Parlez clairement dans votre microphone",
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'accéder au microphone",
        variant: "destructive",
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.pause();
      setIsPaused(true);
      
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "paused") {
      mediaRecorder.resume();
      setIsPaused(false);
      
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setRecordingTimer(timer);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && (mediaRecorder.state === "recording" || mediaRecorder.state === "paused")) {
      mediaRecorder.stop();
      
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
    }
  };

  const resetRecording = () => {
    stopRecording();
    setAudioChunks([]);
    setRecordingTime(0);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }
  };

  const playAudio = () => {
    if (audioElement) {
      audioElement.play();
    }
  };

  const pauseAudio = () => {
    if (audioElement) {
      audioElement.pause();
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const saveRecording = async (noteId: string) => {
    try {
      if (audioChunks.length === 0) return;
      
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("User not authenticated");
      
      const userId = authData.user.id;
      const filename = `${userId}/${noteId}/${Date.now()}.webm`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('note_recordings')
        .upload(filename, audioBlob);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('note_recordings')
        .getPublicUrl(filename);
      
      const { data: recordingData, error: recordingError } = await supabase
        .from('note_recordings')
        .insert({
          note_id: noteId,
          file_path: urlData.publicUrl,
          duration: recordingTime
        })
        .select()
        .single();
      
      if (recordingError) throw recordingError;
      
      setRecordings(prev => [recordingData, ...prev]);
      
      toast({
        title: "Succès",
        description: "Enregistrement sauvegardé",
      });
      
      resetRecording();
    } catch (error) {
      console.error("Error saving recording:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'enregistrement",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRecording = async (recordingId: string, filePath: string) => {
    try {
      const { error: dbError } = await supabase
        .from('note_recordings')
        .delete()
        .eq('id', recordingId);
      
      if (dbError) throw dbError;
      
      const pathParts = filePath.split('note_recordings/');
      if (pathParts.length > 1) {
        const filename = pathParts[1];
        
        const { error: storageError } = await supabase.storage
          .from('note_recordings')
          .remove([filename]);
        
        if (storageError) console.error("Storage deletion error:", storageError);
      }
      
      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      
      toast({
        title: "Succès",
        description: "Enregistrement supprimé",
      });
    } catch (error) {
      console.error("Error deleting recording:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'enregistrement",
        variant: "destructive",
      });
    }
  };

  const playRecording = (url: string) => {
    if (audioElement) {
      audioElement.pause();
    }
    
    const audio = new Audio(url);
    audio.play();
    setAudioElement(audio);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Mes Notes</h2>
        {!isEditing && (
          <Button onClick={handleNewNote} className="gap-2">
            <PlusCircle className="w-4 h-4" />
            Nouvelle Note
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : isEditing ? (
        <div className="flex-1 flex flex-col">
          <div className="mb-4">
            <Input
              placeholder="Titre de la note"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="text-lg font-semibold"
            />
          </div>
          <div className="flex-1 mb-4">
            <Textarea
              placeholder="Contenu de la note..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[200px] h-full"
            />
          </div>
          
          <div className="mb-4 bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Enregistrements audio</h3>
              <div className="flex gap-2">
                {isRecording ? (
                  <>
                    {isPaused ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={resumeRecording}
                        className="gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Reprendre
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={pauseRecording}
                        className="gap-2"
                      >
                        <Pause className="w-4 h-4" />
                        Pause
                      </Button>
                    )}
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={stopRecording}
                      className="gap-2"
                    >
                      <MicOff className="w-4 h-4" />
                      Arrêter
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={startRecording}
                    className="gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    Enregistrer
                  </Button>
                )}
              </div>
            </div>
            
            {isRecording && (
              <div className="flex items-center mb-2">
                <div className="mr-2">
                  <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                </div>
                <span>{isPaused ? "En pause" : "Enregistrement en cours"}: {formatTime(recordingTime)}</span>
              </div>
            )}
            
            {audioUrl && !isRecording && (
              <div className="flex items-center justify-between mb-2 bg-background p-2 rounded">
                <div className="flex items-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={audioElement?.paused ? playAudio : pauseAudio}
                    className="p-1"
                  >
                    {audioElement?.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </Button>
                  <span className="ml-2">Nouvel enregistrement - {formatTime(recordingTime)}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetRecording}
                  className="text-destructive hover:text-destructive p-1"
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {recordings.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Enregistrements existants</h4>
                <div className="space-y-2">
                  {recordings.map((recording) => (
                    <div 
                      key={recording.id} 
                      className="flex items-center justify-between bg-background p-2 rounded"
                    >
                      <div className="flex items-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => playRecording(recording.file_path)}
                          className="p-1"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <span className="ml-2">
                          {format(new Date(recording.created_at), 'dd/MM/yyyy HH:mm')}
                          {recording.duration && ` - ${formatTime(recording.duration)}`}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteRecording(recording.id, recording.file_path)}
                        className="text-destructive hover:text-destructive p-1"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                resetRecording();
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleSaveNote} className="gap-2">
              <Save className="w-4 h-4" />
              Sauvegarder
            </Button>
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mb-4">
            <TabsTrigger value="all">Toutes</TabsTrigger>
            <TabsTrigger value="pinned">Épinglées</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="flex-1 overflow-auto">
            {pinnedNotes.length === 0 && notes.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Vous n'avez pas encore de notes. Créez-en une nouvelle pour commencer.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {pinnedNotes.map((note) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="col-span-1"
                    >
                      <Card className="h-full border-2 border-yellow-500/40 shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="cursor-pointer" onClick={() => handleEditNote(note)}>
                              {note.title}
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleTogglePin(note)}
                            >
                              <Pin className="h-4 w-4 text-yellow-500" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <p className="line-clamp-3 text-sm text-muted-foreground">
                            {note.content || "Aucun contenu"}
                          </p>
                        </CardContent>
                        <CardFooter className="flex justify-between pt-2">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(note.updated_at), "dd/MM/yyyy HH:mm")}
                          </p>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditNote(note)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                  {notes.map((note) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="col-span-1"
                    >
                      <Card className="h-full hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="cursor-pointer" onClick={() => handleEditNote(note)}>
                              {note.title}
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleTogglePin(note)}
                            >
                              <PinOff className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <p className="line-clamp-3 text-sm text-muted-foreground">
                            {note.content || "Aucun contenu"}
                          </p>
                        </CardContent>
                        <CardFooter className="flex justify-between pt-2">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(note.updated_at), "dd/MM/yyyy HH:mm")}
                          </p>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditNote(note)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="pinned" className="flex-1 overflow-auto">
            {pinnedNotes.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Vous n'avez pas encore de notes épinglées.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {pinnedNotes.map((note) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="col-span-1"
                    >
                      <Card className="h-full border-2 border-yellow-500/40 shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="cursor-pointer" onClick={() => handleEditNote(note)}>
                              {note.title}
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleTogglePin(note)}
                            >
                              <Pin className="h-4 w-4 text-yellow-500" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <p className="line-clamp-3 text-sm text-muted-foreground">
                            {note.content || "Aucun contenu"}
                          </p>
                        </CardContent>
                        <CardFooter className="flex justify-between pt-2">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(note.updated_at), "dd/MM/yyyy HH:mm")}
                          </p>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditNote(note)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

