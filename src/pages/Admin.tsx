
import { useEffect, useState } from 'react';
import { generateAndStoreVapidKeys } from '@/lib/generateVapidKeys';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { ThemeToggle } from '@/components/interpreter/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, RotateCw, Copy, Key } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<{
    publicKey: string;
    privateKey: string;
    copyInstructions: string;
  } | null>(null);
  const [vapidStatus, setVapidStatus] = useState<{
    isValid: boolean;
    errorMessage?: string;
    details?: {
      publicKey?: string;
      privateKey?: string;
    };
  } | null>(null);

  const validateVapidKeys = async () => {
    try {
      setIsValidating(true);
      console.log('[VAPID] Starting validation');

      const { data, error } = await supabase.functions.invoke('validate-vapid-key', {
        method: 'POST'
      });

      if (error) throw error;

      setVapidStatus({
        isValid: data.valid,
        details: data.details,
        errorMessage: data.error
      });

      if (!data.valid) {
        console.error('[VAPID] Validation failed:', data.details);
      }
    } catch (error) {
      console.error('[VAPID] Validation error:', error);
      setVapidStatus({
        isValid: false,
        errorMessage: error.message || 'Failed to validate VAPID keys'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const copyToClipboard = async (text: string, description: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copié !",
        description: `${description} copié dans le presse-papiers`,
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de copier dans le presse-papiers",
        variant: "destructive",
      });
    }
  };

  const copyFullInstructions = async () => {
    if (!generatedKeys) return;
    try {
      await navigator.clipboard.writeText(generatedKeys.copyInstructions);
      toast({
        title: "Instructions copiées !",
        description: "Les instructions complètes ont été copiées dans le presse-papiers",
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de copier dans le presse-papiers",
        variant: "destructive",
      });
    }
  };

  const setupVapidKeys = async () => {
    try {
      setIsGenerating(true);
      const keys = await generateAndStoreVapidKeys();
      console.log('[VAPID] Keys generated successfully:', keys);
      setGeneratedKeys(keys);
      toast({
        title: "Succès",
        description: "Les clés VAPID ont été générées avec succès",
      });
      // Validate the new keys
      await validateVapidKeys();
    } catch (error) {
      console.error('[VAPID] Failed to generate keys:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer les clés VAPID. Vérifiez les logs pour plus de détails.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('No user found, redirecting to login');
          navigate('/admin/login');
          return;
        }

        // Check if user has admin role
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roles?.role !== 'admin') {
          console.log('User is not an admin, redirecting to login');
          await supabase.auth.signOut();
          navigate('/admin/login');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/admin/login');
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user || event === 'SIGNED_OUT') {
        navigate('/admin/login');
      }
    });

    // Initial auth check and VAPID validation
    checkAuth();
    validateVapidKeys();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Tableau de bord administrateur</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Configuration des notifications push</CardTitle>
            <CardDescription>
              Gérez les clés VAPID nécessaires pour l'envoi des notifications push
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatedKeys && (
                <Alert className="bg-green-50 dark:bg-green-950 mb-4">
                  <Key className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertTitle>Nouvelles clés VAPID générées</AlertTitle>
                  <AlertDescription className="mt-2 space-y-4">
                    <div className="flex items-center justify-between gap-2 bg-background/50 p-2 rounded">
                      <div className="flex-1">
                        <p className="font-semibold mb-1">VAPID_PUBLIC_KEY:</p>
                        <p className="text-sm font-mono break-all bg-background/80 p-2 rounded">{generatedKeys.publicKey}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(generatedKeys.publicKey, "VAPID_PUBLIC_KEY")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-background/50 p-2 rounded">
                      <div className="flex-1">
                        <p className="font-semibold mb-1">VAPID_PRIVATE_KEY:</p>
                        <p className="text-sm font-mono break-all bg-background/80 p-2 rounded">{generatedKeys.privateKey}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(generatedKeys.privateKey, "VAPID_PRIVATE_KEY")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-4">
                      <Button
                        variant="secondary"
                        onClick={copyFullInstructions}
                        className="w-full flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copier les instructions complètes
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {vapidStatus && (
                <Alert className={`${vapidStatus.isValid ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                  {vapidStatus.isValid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                  <AlertTitle>
                    {vapidStatus.isValid ? 'Clés VAPID valides' : 'Problème avec les clés VAPID'}
                  </AlertTitle>
                  <AlertDescription>
                    {vapidStatus.isValid 
                      ? 'Les notifications push peuvent être utilisées.'
                      : vapidStatus.errorMessage || 'Les clés VAPID ne sont pas valides.'}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-4">
                <Button
                  onClick={setupVapidKeys}
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RotateCw className="h-4 w-4 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4" />
                      Générer nouvelles clés VAPID
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={validateVapidKeys}
                  disabled={isValidating}
                  className="flex items-center gap-2"
                >
                  <RotateCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                  Vérifier les clés
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <AdminDashboard />
      </div>
    </div>
  );
};

export default Admin;
