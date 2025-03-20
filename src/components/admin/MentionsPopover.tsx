
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUnreadMentions, UnreadMention } from "@/hooks/chat/useUnreadMentions";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export const MentionsPopover = () => {
  const { 
    unreadMentions, 
    totalUnreadCount, 
    markMentionAsRead, 
    deleteMention, 
    markAllMentionsAsRead,
    refreshMentions
  } = useUnreadMentions();
  
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Automatically refresh mentions when popover opens
  useEffect(() => {
    if (open) {
      refreshMentions();
    }
  }, [open, refreshMentions]);

  const handleMentionClick = async (mention: UnreadMention) => {
    try {
      await markMentionAsRead(mention.mention_id);
      navigate(`/admin?tab=messages&channelId=${mention.channel_id}&messageId=${mention.message_id}`);
      setOpen(false);
      
      toast({
        title: "Notification marquée comme lue",
        description: "Vous avez été redirigé vers le message"
      });
    } catch (error) {
      console.error("Error handling mention click:", error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer la notification comme lue",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMention = async (e: React.MouseEvent, mentionId: string) => {
    e.stopPropagation();
    try {
      await deleteMention(mentionId);
      toast({
        title: "Notification supprimée",
        description: "La notification a été supprimée avec succès"
      });
    } catch (error) {
      console.error("Error deleting mention:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la notification",
        variant: "destructive"
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalUnreadCount > 0 && (
            <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-destructive text-[10px] flex items-center justify-center text-white font-medium translate-x-1/3 -translate-y-1/3">
              {totalUnreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="flex items-center justify-between p-4">
          <div className="font-medium">Notifications</div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={markAllMentionsAsRead}
            disabled={!unreadMentions.length}
            className="text-xs"
          >
            Tout marquer comme lu
          </Button>
        </div>
        <Separator />
        <ScrollArea className="max-h-[300px]">
          {unreadMentions.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            <div className="grid gap-1">
              {unreadMentions.map((mention) => (
                <div
                  key={mention.mention_id}
                  className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleMentionClick(mention)}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {mention.mentioning_user_name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {format(
                          new Date(mention.created_at),
                          "dd MMM HH:mm",
                          { locale: fr }
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {mention.message_content}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    onClick={(e) => handleDeleteMention(e, mention.mention_id)}
                  >
                    <span className="sr-only">Supprimer</span>
                    <span className="text-xs">×</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
