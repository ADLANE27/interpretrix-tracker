
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createRoot } from "react-dom/client";

export const showCustomPermissionMessage = () => {
  const PermissionDialog = () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notifications bloquées</DialogTitle>
            <DialogDescription>
              Pour recevoir des notifications, vous devez les autoriser dans les paramètres de votre navigateur.
              <br /><br />
              1. Cliquez sur l'icône de cadenas dans la barre d'adresse
              <br />
              2. Trouvez "Notifications" dans les paramètres
              <br />
              3. Sélectionnez "Autoriser"
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsOpen(false)}>Compris</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Create a div for the dialog
  const dialogContainer = document.createElement('div');
  document.body.appendChild(dialogContainer);

  // Render the dialog
  const root = createRoot(dialogContainer);
  root.render(<PermissionDialog />);
};
