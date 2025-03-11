
import { useToast } from "@/hooks/use-toast";

export const useUserManagementToasts = () => {
  const { toast } = useToast();

  const showSuccessToast = (title: string, description: string) => {
    toast({
      title,
      description,
      duration: 3000,
    });
  };

  const showErrorToast = (title: string, error: any) => {
    const errorMessage = error?.message || 'Une erreur est survenue';
    toast({
      title,
      description: errorMessage,
      variant: "destructive",
      duration: 5000,
    });
  };

  const showLoadingToast = (title: string, description: string) => {
    return toast({
      title,
      description,
      duration: 1500,
    });
  };

  return {
    showSuccessToast,
    showErrorToast,
    showLoadingToast,
  };
};
