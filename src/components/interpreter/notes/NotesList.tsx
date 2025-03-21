
import { useState } from "react";
import { format } from "date-fns";
import { Pin, PinOff, Play, Trash, Image } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getNoteColorStyles, truncateHtml } from "@/utils/notesUtils";
import DOMPurify from 'dompurify';

export interface Note {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  mission_id: string | null;
  color?: string;
  drawing_data?: string | null;
  note_type: 'text' | 'drawing' | 'mixed';
}

interface NotesListProps {
  notes: Note[];
  pinnedNotes: Note[];
  showPinnedOnly?: boolean;
  onEditNote: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
}

export const NotesList = ({ 
  notes, 
  pinnedNotes, 
  showPinnedOnly = false, 
  onEditNote, 
  onTogglePin, 
  onDeleteNote 
}: NotesListProps) => {
  const displayNotes = showPinnedOnly ? pinnedNotes : [...pinnedNotes, ...notes];
  
  if (displayNotes.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          {showPinnedOnly 
            ? "Vous n'avez pas encore de notes épinglées."
            : "Vous n'avez pas encore de notes. Créez-en une nouvelle pour commencer."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatePresence>
        {displayNotes.map((note) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="col-span-1"
          >
            <Card 
              className={`h-full ${note.is_pinned ? "border-2 border-yellow-500/40 shadow-md hover:shadow-lg" : "hover:shadow-md"} transition-shadow`}
              style={getNoteColorStyles(note.color || 'transparent')}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="cursor-pointer" onClick={() => onEditNote(note)}>
                    {note.title}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onTogglePin(note)}
                  >
                    {note.is_pinned ? (
                      <Pin className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <PinOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                {note.note_type === 'drawing' ? (
                  <div className="flex justify-center items-center p-2 bg-muted/20 rounded">
                    <Image className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground ml-2">Dessin</span>
                  </div>
                ) : (
                  <div 
                    className="line-clamp-3 text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(truncateHtml(note.content || "Aucun contenu")) 
                    }}
                  />
                )}
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
                    onClick={() => onEditNote(note)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => onDeleteNote(note.id)}
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
  );
};
