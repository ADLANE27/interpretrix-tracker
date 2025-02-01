import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateChannelDialog = ({
  open,
  onOpenChange,
}: CreateChannelDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"admin_only" | "internal" | "external" | "mixed">("mixed");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("channels").insert({
        name,
        description,
        type,
        created_by: user.id
      });

      if (error) throw error;

      toast({
        title: "Channel created",
        description: "The channel has been created successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["channels"] });
      onOpenChange(false);
      setName("");
      setDescription("");
      setType("mixed");
    } catch (error) {
      console.error("Error creating channel:", error);
      toast({
        title: "Error",
        description: "Failed to create channel",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
          <DialogDescription>
            Create a new channel for communication with interpreters
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Channel Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter channel name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter channel description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Channel Type</Label>
            <Select value={type} onValueChange={(value: typeof type) => setType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select channel type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin_only">Admin Only</SelectItem>
                <SelectItem value="internal">Internal Interpreters</SelectItem>
                <SelectItem value="external">External Interpreters</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Channel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};