
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { type Note } from "./NotesList";
import { type Recording } from "./AudioRecorder";
import { sanitizeHtml } from "@/utils/notesUtils";

export const useNotes = () => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editorType, setEditorType] = useState<'text' | 'drawing'>('text');
  const [drawingData, setDrawingData] = useState<string>('');
  const [noteColor, setNoteColor] = useState<string>('transparent');

  // Audio recording state
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
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
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

      // Transform the data to ensure note_type field exists
      const transformedNotes = notesData.map(note => ({
        ...note,
        note_type: note.note_type || (note.drawing_data ? 'drawing' : 'text'),
        color: note.color || 'transparent',
        drawing_data: note.drawing_data || null
      })) as Note[];

      const pinned = transformedNotes.filter(note => note.is_pinned);
      const unpinned = transformedNotes.filter(note => !note.is_pinned);
      
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
    setEditorType('text');
    setDrawingData('');
    setNoteColor('transparent');
    setIsEditing(true);
    setRecordings([]);
    setAudioUrl(null);
    resetRecording();
  };

  const handleEditNote = async (note: Note) => {
    setCurrentNote(note);
    setNewTitle(note.title);
    setNewContent(note.content || "");
    setNoteColor(note.color || 'transparent');
    setDrawingData(note.drawing_data || '');
    setEditorType(note.note_type === 'drawing' ? 'drawing' : 'text');
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

      let noteType: 'text' | 'drawing' | 'mixed' = 'text';
      if (editorType === 'drawing' && drawingData) {
        noteType = 'drawing';
      } else if (editorType === 'text' && newContent) {
        noteType = 'text';
      }
      
      const cleanContent = noteType === 'text' ? sanitizeHtml(newContent) : newContent;

      if (currentNote) {
        const { data, error } = await supabase
          .from("interpreter_notes")
          .update({
            title: newTitle,
            content: cleanContent,
            color: noteColor,
            drawing_data: drawingData || null,
            note_type: noteType,
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
            content: cleanContent,
            interpreter_id: authData.user.id,
            color: noteColor,
            drawing_data: drawingData || null,
            note_type: noteType
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

  return {
    notes,
    pinnedNotes,
    isLoading,
    isEditing,
    currentNote,
    newTitle,
    setNewTitle,
    newContent,
    setNewContent,
    editorType,
    setEditorType,
    drawingData,
    setDrawingData,
    noteColor,
    setNoteColor,
    isRecording,
    isPaused,
    recordings,
    audioChunks,
    recordingTime,
    audioUrl,
    audioElement,
    handleNewNote,
    handleEditNote,
    handleSaveNote,
    handleDeleteNote,
    handleTogglePin,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    playAudio,
    pauseAudio,
    handleDeleteRecording,
    playRecording,
    fetchNotes,
    fetchRecordings,
    setIsEditing
  };
};
