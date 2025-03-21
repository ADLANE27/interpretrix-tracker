
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlusCircle } from "lucide-react";
import { NotesList } from "./notes/NotesList";
import { NoteEditor } from "./notes/NoteEditor";
import { useNotes } from "./notes/useNotes";

export const NotesTab = () => {
  const { activeTab, setActiveTab } = useTabPersistence('notes', 'all');
  const { 
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
    playRecording,
    handleDeleteRecording,
    setIsEditing
  } = useNotes();

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
        <NoteEditor
          currentNote={currentNote}
          onSave={handleSaveNote}
          onCancel={() => {
            setIsEditing(false);
            resetRecording();
          }}
          title={newTitle}
          setTitle={setNewTitle}
          content={newContent}
          setContent={setNewContent}
          noteColor={noteColor}
          setNoteColor={setNoteColor}
          drawingData={drawingData}
          setDrawingData={setDrawingData}
          editorType={editorType}
          setEditorType={setEditorType}
          recordings={recordings}
          setRecordings={() => {}}
          audioChunks={audioChunks}
          audioUrl={audioUrl}
          audioElement={audioElement}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onPauseRecording={pauseRecording}
          onResumeRecording={resumeRecording}
          onResetRecording={resetRecording}
          isRecording={isRecording}
          isPaused={isPaused}
          recordingTime={recordingTime}
          onPlayRecording={playRecording}
          onDeleteRecording={handleDeleteRecording}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mb-4">
            <TabsTrigger value="all">Toutes</TabsTrigger>
            <TabsTrigger value="pinned">Épinglées</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="flex-1 overflow-auto">
            <NotesList
              notes={notes}
              pinnedNotes={pinnedNotes}
              onEditNote={handleEditNote}
              onTogglePin={handleTogglePin}
              onDeleteNote={handleDeleteNote}
            />
          </TabsContent>
          
          <TabsContent value="pinned" className="flex-1 overflow-auto">
            <NotesList
              notes={[]}
              pinnedNotes={pinnedNotes}
              showPinnedOnly={true}
              onEditNote={handleEditNote}
              onTogglePin={handleTogglePin}
              onDeleteNote={handleDeleteNote}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
