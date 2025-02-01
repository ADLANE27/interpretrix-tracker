import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddChannelMemberFormProps {
  channelId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const AddChannelMemberForm = ({
  channelId,
  onSuccess,
  onCancel,
}: AddChannelMemberFormProps) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // First, get the user ID from the email
      const { data: users, error: userError } = await supabase
        .from("interpreter_profiles")
        .select("id")
        .eq("email", email)
        .single();

      if (userError) throw userError;
      if (!users) throw new Error("User not found");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Then add the user to the channel
      const { error: memberError } = await supabase.from("channel_members").insert({
        channel_id: channelId,
        user_id: users.id,
        added_by: user.id,
      });

      if (memberError) throw memberError;

      toast({
        title: "Member added",
        description: "The member has been added to the channel",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Error adding member:", error);
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
        <Label htmlFor="email">Member Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter member email"
          required
        />
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
          {isSubmitting ? "Adding..." : "Add Member"}
        </Button>
      </div>
    </form>
  );
};