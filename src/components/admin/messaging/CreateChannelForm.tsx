import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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

interface CreateChannelFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const CreateChannelForm = ({ onSuccess, onCancel }: CreateChannelFormProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"admin_only" | "internal" | "external" | "mixed">("mixed");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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

      onSuccess();
    } catch (error: any) {
      console.error("Error creating channel:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
        <Input
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
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Channel"}
        </Button>
      </div>
    </form>
  );
};