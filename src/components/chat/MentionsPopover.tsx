
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MessageSquare, X, Check, Bell } from "lucide-react";
import { UnreadMention } from "@/hooks/chat/useUnreadMentions";

interface MentionsPopoverProps {
  mentions: UnreadMention[];
  totalCount: number;
  onMentionClick: (mention: UnreadMention) => void;
  onMarkAsRead: (mentionId: string) => void;
  onDelete: (mentionId: string) => void;
}

export const MentionsPopover = ({
  mentions,
  totalCount,
  onMentionClick,
  onMarkAsRead,
  onDelete,
}: MentionsPopoverProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge 
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Mentions Récentes</h3>
            {mentions.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune mention non lue</p>
            )}
          </div>
          <ScrollArea className="h-[400px] pr-4">
            {mentions.map((mention) => (
              <Card
                key={mention.mention_id}
                className="p-3 mb-2 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      onMentionClick(mention);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {mention.mentioning_user_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(mention.created_at, "HH:mm, d MMM")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {mention.message_content}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onMarkAsRead(mention.mention_id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onDelete(mention.mention_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};
