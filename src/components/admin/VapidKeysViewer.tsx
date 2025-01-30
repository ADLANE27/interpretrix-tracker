import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export const VapidKeysViewer = () => {
  const { toast } = useToast();
  
  const { data: vapidKeys, isLoading, error } = useQuery({
    queryKey: ["vapid-keys"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-vapid-keys');
      if (error) throw error;
      return data;
    }
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copié !",
        description: `La clé ${label} a été copiée dans le presse-papier`,
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de copier la clé",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Chargement des clés VAPID...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Erreur lors du chargement des clés VAPID : {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clés VAPID</CardTitle>
        <CardDescription>
          Ces clés sont utilisées pour l'envoi des notifications push aux interprètes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Clé publique :</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(vapidKeys.publicKey, "publique")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <code className="block p-2 bg-muted rounded text-xs break-all">
            {vapidKeys.publicKey}
          </code>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Clé privée :</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(vapidKeys.privateKey, "privée")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <code className="block p-2 bg-muted rounded text-xs break-all">
            {vapidKeys.privateKey}
          </code>
        </div>
      </CardContent>
    </Card>
  );
};