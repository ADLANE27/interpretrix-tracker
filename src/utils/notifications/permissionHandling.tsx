
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import React from "react";

export const showCustomPermissionMessage = () => {
  toast({
    title: "Notifications bloquées",
    description: "Pour recevoir les nouvelles missions, veuillez autoriser les notifications dans les paramètres de votre navigateur.",
    variant: "destructive",
    duration: 10000,
    action: (
      <Button
        onClick={() => {
          if (typeof Notification !== 'undefined' && Notification.requestPermission) {
            Notification.requestPermission();
          }
        }}
        variant="outline"
        className="bg-white text-red-600 hover:bg-red-50"
      >
        Autoriser
      </Button>
    ),
  });
};
