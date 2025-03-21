
import { format } from "date-fns";
import { Mic, MicOff, Pause, Play, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Recording {
  id: string;
  note_id: string;
  file_path: string;
  duration: number | null;
  created_at: string;
}

interface AudioRecorderProps {
  recordings: Recording[];
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  audioUrl: string | null;
  audioElement: HTMLAudioElement | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onResetRecording: () => void;
  onPlayRecording: (url: string) => void;
  onDeleteRecording: (id: string, path: string) => void;
}

export const AudioRecorder = ({
  recordings,
  isRecording,
  isPaused,
  recordingTime,
  audioUrl,
  audioElement,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onResetRecording,
  onPlayRecording,
  onDeleteRecording
}: AudioRecorderProps) => {
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
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
                  onClick={onResumeRecording}
                  className="gap-2"
                >
                  <Play className="w-4 h-4" />
                  Reprendre
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onPauseRecording}
                  className="gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
              )}
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={onStopRecording}
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
              onClick={onStartRecording}
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
              onClick={audioElement?.paused ? () => {audioElement?.play()} : () => {audioElement?.pause()}}
              className="p-1"
            >
              {audioElement?.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
            <span className="ml-2">Nouvel enregistrement - {formatTime(recordingTime)}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onResetRecording}
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
                    onClick={() => onPlayRecording(recording.file_path)}
                    className="p-1"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <span className="ml-2">
                    {format(new Date(recording.created_at), 'dd/MM/yyyy HH:mm')}
                    {recording.duration && ` - ${formatTime(recording.duration)}`}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onDeleteRecording(recording.id, recording.file_path)}
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
  );
};
