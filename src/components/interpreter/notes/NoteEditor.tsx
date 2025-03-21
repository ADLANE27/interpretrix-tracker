
import { useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "./ColorPicker";
import { EditorTypeSelector } from "./EditorTypeSelector";
import { RichTextEditor } from "./RichTextEditor";
import { DrawingCanvas } from "./DrawingCanvas";
import { AudioRecorder } from "./AudioRecorder";
import { type Note } from "./NotesList";
import { type Recording } from "./AudioRecorder";

interface NoteEditorProps {
  currentNote: Note | null;
  onSave: () => void;
  onCancel: () => void;
  title: string;
  setTitle: (title: string) => void;
  content: string;
  setContent: (content: string) => void;
  noteColor: string;
  setNoteColor: (color: string) => void;
  drawingData: string;
  setDrawingData: (data: string) => void;
  editorType: 'text' | 'drawing';
  setEditorType: (type: 'text' | 'drawing') => void;
  recordings: Recording[];
  setRecordings: (recordings: Recording[]) => void;
  audioChunks: Blob[];
  audioUrl: string | null;
  audioElement: HTMLAudioElement | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onResetRecording: () => void;
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  onPlayRecording: (url: string) => void;
  onDeleteRecording: (id: string, path: string) => void;
}

export const NoteEditor = ({
  currentNote,
  onSave,
  onCancel,
  title,
  setTitle,
  content,
  setContent,
  noteColor,
  setNoteColor,
  drawingData,
  setDrawingData,
  editorType,
  setEditorType,
  recordings,
  setRecordings,
  audioChunks,
  audioUrl,
  audioElement,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onResetRecording,
  isRecording,
  isPaused,
  recordingTime,
  onPlayRecording,
  onDeleteRecording
}: NoteEditorProps) => {
  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-4 flex gap-3 items-center">
        <Input
          placeholder="Titre de la note"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-semibold flex-1"
        />
        <ColorPicker 
          selectedColor={noteColor} 
          onChange={setNoteColor} 
        />
      </div>
      
      <div className="flex-1 mb-4 flex flex-col min-h-0">
        <EditorTypeSelector
          editorType={editorType}
          onChange={setEditorType}
        />
        
        <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
          {editorType === 'text' ? (
            <RichTextEditor
              content={content}
              onChange={setContent}
              className="min-h-[300px] h-full"
              placeholder="Contenu de la note..."
            />
          ) : (
            <DrawingCanvas
              onChange={setDrawingData}
              initialData={drawingData}
              className="min-h-[300px] h-full"
            />
          )}
        </div>
      </div>
      
      <AudioRecorder
        recordings={recordings}
        isRecording={isRecording}
        isPaused={isPaused}
        recordingTime={recordingTime}
        audioUrl={audioUrl}
        audioElement={audioElement}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        onPauseRecording={onPauseRecording}
        onResumeRecording={onResumeRecording}
        onResetRecording={onResetRecording}
        onPlayRecording={onPlayRecording}
        onDeleteRecording={onDeleteRecording}
      />
      
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Annuler
        </Button>
        <Button onClick={onSave} className="gap-2">
          <Save className="w-4 h-4" />
          Sauvegarder
        </Button>
      </div>
    </div>
  );
};
