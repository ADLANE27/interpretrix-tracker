
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

// Define type-safe schema types
const verifySchema = z.object({
  password: z.string().min(1, "Le mot de passe est requis"),
  confirmPassword: z.string().optional(),
});

const setupSchema = z.object({
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof verifySchema> | z.infer<typeof setupSchema>;

interface UserManagementPasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (password: string) => Promise<void>;
  mode: 'setup' | 'verify' | 'change';
}

export const UserManagementPasswordDialog = ({
  isOpen,
  onOpenChange,
  onSubmit,
  mode
}: UserManagementPasswordDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const schema = mode === 'verify' ? verifySchema : setupSchema;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (values: FormData) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      await onSubmit(values.password);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const titles = {
    setup: "Définir le mot de passe de gestion des utilisateurs",
    verify: "Entrer le mot de passe de gestion des utilisateurs",
    change: "Modifier le mot de passe de gestion des utilisateurs"
  } as const;

  const descriptions = {
    setup: "Définissez un mot de passe pour protéger la gestion des utilisateurs. Partagez ce mot de passe uniquement avec les administrateurs de confiance.",
    verify: "Entrez le mot de passe de gestion des utilisateurs pour continuer.",
    change: "Entrez un nouveau mot de passe pour la gestion des utilisateurs."
  } as const;

  return (
    <Dialog open={isOpen} onOpenChange={mode === 'verify' ? undefined : onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titles[mode]}</DialogTitle>
          <DialogDescription>{descriptions[mode]}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{mode === 'verify' ? 'Mot de passe' : 'Nouveau mot de passe'}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode !== 'verify' && (
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer le mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Traitement..." : mode === 'verify' ? "Vérifier" : "Enregistrer le mot de passe"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
