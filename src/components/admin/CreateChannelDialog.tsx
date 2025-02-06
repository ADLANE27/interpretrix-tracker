import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CreateChannelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelCreated: () => void;
}

export const CreateChannelDialog = ({ isOpen, onClose, onChannelCreated }: CreateChannelDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error: channelError } = await supabase
        .from('chat_channels')
        .insert({
          name,
          description,
          created_by: user.id,
        });

      if (channelError) throw channelError;

      toast({
        title: "Canal créé",
        description: "Le canal de discussion a été créé avec succès",
      });

      onClose();
      onChannelCreated();
      setName("");
      setDescription("");
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le canal",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Créer un nouveau canal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du canal</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du canal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du canal (optionnel)"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              Créer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};