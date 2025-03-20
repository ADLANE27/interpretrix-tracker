
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageSquare, X, Check, Bell } from "lucide-react";
import { UnreadMention } from "@/hooks/chat/useUnreadMentions";
import { useIsMobile } from "@/hooks/use-mobile";
import { eventEmitter, EVENT_UNREAD_MENTIONS_UPDATED } from "@/lib/events";

interface MentionsPopoverProps {
  mentions: UnreadMention[];
  totalCount: number;
  onMentionClick: (mention: UnreadMention) => void;
  onMarkAsRead: (mentionId: string) => void;
  onDelete: (mentionId: string) => void;
  children: React.ReactNode;
}

export const MentionsPopover = ({
  mentions,
  totalCount,
  onMentionClick,
  onMarkAsRead,
  onDelete,
  children
}: MentionsPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [localMentions, setLocalMentions] = useState<UnreadMention[]>(mentions);
  const isMobile = useIsMobile();

  // Sync mentions prop to local state when it changes
  useEffect(() => {
    if (JSON.stringify(mentions) !== JSON.stringify(localMentions)) {
      setLocalMentions(mentions);
    }
  }, [mentions]);

  // Handle marking as read with local state update
  const handleMarkAsRead = (mentionId: string) => {
    setLocalMentions(prev => {
      const filtered = prev.filter(m => m.mention_id !== mentionId);
      // Emit event with updated count
      eventEmitter.emit(EVENT_UNREAD_MENTIONS_UPDATED, filtered.length);
      return filtered;
    });
    onMarkAsRead(mentionId);
  };

  // Handle deletion with local state update
  const handleDelete = (mentionId: string) => {
    setLocalMentions(prev => {
      const filtered = prev.filter(m => m.mention_id !== mentionId);
      // Emit event with updated count
      eventEmitter.emit(EVENT_UNREAD_MENTIONS_UPDATED, filtered.length);
      return filtered;
    });
    onDelete(mentionId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-[500px] p-0 gap-0 overflow-hidden"
      >
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center">
            <span className="font-medium">Mentions Récentes</span>
            <Badge variant="secondary" className="font-normal ml-3">
              {localMentions.length} {localMentions.length === 1 ? 'mention' : 'mentions'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[450px]">
          {localMentions.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mb-4 opacity-20" />
              <p>Aucune mention non lue</p>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-2">
                {localMentions.map((mention) => (
                  <Card
                    key={mention.mention_id}
                    className="p-3 mb-2 transition-colors hover:bg-accent/50 group"
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={() => {
                        onMentionClick(mention);
                        handleMarkAsRead(mention.mention_id);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {mention.mentioning_user_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(mention.created_at, "HH:mm, d MMM")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {mention.message_content}
                      </p>
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(mention.mention_id);
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(mention.mention_id);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
