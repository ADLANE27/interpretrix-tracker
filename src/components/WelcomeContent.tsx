
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building, Headset } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export const WelcomeContent = () => {
  const isMobile = useIsMobile();

  return (
    <div className="relative z-10 px-4 py-16 sm:py-24 flex flex-col items-center">
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center mb-6">
        <span className="text-palette-vivid-purple">
          Bienvenue
        </span>
      </h1>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-6">
        <Button 
          asChild 
          size={isMobile ? "icon" : "lg"} 
          className={`flex-1 ${isMobile ? 'h-14 w-14 rounded-full mx-auto' : ''}`}
        >
          <Link to="/admin/login" className="flex items-center justify-center gap-2">
            <Building className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
            {!isMobile && <span>Espace Administrateur</span>}
          </Link>
        </Button>
        
        <Button 
          asChild 
          variant="secondary" 
          size={isMobile ? "icon" : "lg"} 
          className={`flex-1 ${isMobile ? 'h-14 w-14 rounded-full mx-auto' : ''}`}
        >
          <Link to="/interpreter/login" className="flex items-center justify-center gap-2">
            <Headset className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
            {!isMobile && <span>Espace Interprète</span>}
          </Link>
        </Button>
      </div>
      {isMobile && (
        <div className="flex justify-around w-full max-w-md mt-3">
          <span className="text-xs text-center">Admin</span>
          <span className="text-xs text-center">Interprète</span>
        </div>
      )}
    </div>
  );
};
