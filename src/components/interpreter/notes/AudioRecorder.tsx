
import { format } from "date-fns";
import { Mic, MicOff, Pause, Play, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";

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
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (audioElement) {
      const handleEnded = () => {
        setPlayingId(null);
      };
      
      const handleTimeUpdate = () => {
        setCurrentTime(audioElement.currentTime);
      };
      
      const handleDurationChange = () => {
        setDuration(audioElement.duration);
      };
      
      audioElement.addEventListener('ended', handleEnded);
      audioElement.addEventListener('pause', handleEnded);
      audioElement.addEventListener('timeupdate', handleTimeUpdate);
      audioElement.addEventListener('durationchange', handleDurationChange);
      
      return () => {
        audioElement.removeEventListener('ended', handleEnded);
        audioElement.removeEventListener('pause', handleEnded);
        audioElement.removeEventListener('timeupdate', handleTimeUpdate);
        audioElement.removeEventListener('durationchange', handleDurationChange);
      };
    }
  }, [audioElement]);
  
  const togglePlayPause = () => {
    if (audioElement) {
      if (audioElement.paused) {
        console.log("Playing audio from URL:", audioUrl);
        audioElement.play().catch(error => {
          console.error("Error playing audio:", error);
        });
      } else {
        console.log("Pausing audio");
        audioElement.pause();
      }
    } else {
      console.error("Audio element is null, cannot play/pause");
    }
  };
  
  const handlePlayRecording = (recording: Recording) => {
    if (playingId === recording.id && audioElement && !audioElement.paused) {
      console.log("Stopping current playback");
      audioElement.pause();
      setPlayingId(null);
      return;
    }
    
    console.log("Playing recording from URL:", recording.file_path);
    setPlayingId(recording.id);
    onPlayRecording(recording.file_path);
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
        <div className="flex flex-col mb-2 bg-background p-2 rounded">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={togglePlayPause}
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
          
          {audioElement && (
            <div className="mt-2 px-2">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  if (audioElement) {
                    audioElement.currentTime = Number(e.target.value);
                  }
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {recordings.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Enregistrements existants</h4>
          <div className="space-y-2">
            {recordings.map((recording) => (
              <div 
                key={recording.id} 
                className="flex flex-col bg-background p-2 rounded"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handlePlayRecording(recording)}
                      className="p-1"
                    >
                      {playingId === recording.id && audioElement && !audioElement.paused ? 
                        <Pause className="h-4 w-4" /> : 
                        <Play className="h-4 w-4" />
                      }
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
                
                {playingId === recording.id && audioElement && (
                  <div className="mt-2 px-2">
                    <input
                      type="range"
                      min="0"
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => {
                        if (audioElement) {
                          audioElement.currentTime = Number(e.target.value);
                        }
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
