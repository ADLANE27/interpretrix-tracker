
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
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        align="center" 
        side="bottom"
        sideOffset={5}
        className={`${isMobile ? 'w-[calc(100vw-64px)]' : 'w-80'} !fixed !left-[50%] !-translate-x-[50%] !top-[80px] p-0 overflow-hidden`}
      >
        <div className="flex flex-col h-[500px]">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Mentions Récentes</h3>
              <Badge variant="secondary" className="font-normal">
                {totalCount} {totalCount === 1 ? 'mention' : 'mentions'}
              </Badge>
            </div>
          </div>

          {mentions.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mb-4 opacity-20" />
              <p>Aucune mention non lue</p>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-2">
                {mentions.map((mention) => (
                  <Card
                    key={mention.mention_id}
                    className="p-3 mb-2 transition-colors hover:bg-accent/50 group"
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={() => {
                        onMentionClick(mention);
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
                            onMarkAsRead(mention.mention_id);
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
                            onDelete(mention.mention_id);
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
      </PopoverContent>
    </Popover>
  );
};
