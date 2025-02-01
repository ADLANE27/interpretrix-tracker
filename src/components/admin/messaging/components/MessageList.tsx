import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Trash2, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  read_at: string | null;
}

interface MessageListProps {
  messages: Message[];
  selectedInterpreter: string;
  editingMessage: string | null;
  editContent: string;
  onEditStart: (messageId: string, content: string) => void;
  onEditCancel: () => void;
  onEditSave: (messageId: string) => void;
  onEditChange: (content: string) => void;
  onDeleteMessage: (messageId: string) => void;
}

export const MessageList = ({
  messages,
  selectedInterpreter,
  editingMessage,
  editContent,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditChange,
  onDeleteMessage,
}: MessageListProps) => {
  return (
    <ScrollArea className="h-[400px] w-full pr-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-3 rounded-lg max-w-[80%] ${
              message.sender_id === selectedInterpreter
                ? "bg-secondary ml-auto"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {editingMessage === message.id ? (
              <div className="space-y-2">
                <Input
                  value={editContent}
                  onChange={(e) => onEditChange(e.target.value)}
                  className="bg-white"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onEditSave(message.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onEditCancel}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">{message.content}</div>
                  {message.sender_id !== selectedInterpreter && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditStart(message.id, message.content)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirmer la suppression</DialogTitle>
                            <DialogDescription>
                              Êtes-vous sûr de vouloir supprimer ce message ?
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline">Annuler</Button>
                            <Button
                              variant="destructive"
                              onClick={() => onDeleteMessage(message.id)}
                            >
                              Supprimer
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
                <div className="text-xs opacity-70 mt-1 flex items-center gap-2">
                  {new Date(message.created_at).toLocaleString()}
                  {message.read_at && message.sender_id !== selectedInterpreter && (
                    <span className="text-green-500">Lu</span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};