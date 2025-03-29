import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";
import { supabase } from "@/integrations/supabase/client";

interface AppContextType {
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate("/interpreter/login");
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, [navigate]);
  
  useEffect(() => {
    // Begin realtime subscription for interpreter status updates
    if (!initialized) {
      setInitialized(true);
      
      // Show connection status toast
      toast({
        title: "Connexion établie",
        description: "Connexion aux mises à jour en temps réel établie avec succès.",
        variant: "default", // Using default variant
        duration: 3000,
      });
    }
  }, [initialized, navigate, toast]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <AppContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
    </AppContext.Provider>
  );
}
