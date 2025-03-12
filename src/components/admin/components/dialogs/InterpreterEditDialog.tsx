
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { InterpreterProfileForm } from "@/components/admin/forms/InterpreterProfileForm";
import { UserData } from "../../types/user-management";
import { Profile } from "@/types/profile";

interface InterpreterEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: UserData | null;
  onSubmit: (data: Partial<Profile>) => Promise<void>;
  isSubmitting: boolean;
}

export const InterpreterEditDialog = ({
  isOpen,
  onOpenChange,
  selectedUser,
  onSubmit,
  isSubmitting,
}: InterpreterEditDialogProps) => {
  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!isSubmitting) {
          onOpenChange(open);
        }
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Modifier le profil de l'interprète</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[85vh] px-1">
          {selectedUser && (
            <>
              {isSubmitting && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                  <LoadingSpinner size="lg" text="Mise à jour du profil..." />
                </div>
              )}
              <InterpreterProfileForm
                isEditing={true}
                initialData={selectedUser}
                onSubmit={onSubmit}
                isSubmitting={isSubmitting}
              />
            </>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
