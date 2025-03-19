
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building, Headset } from "lucide-react";

export const WelcomeContent = () => {
  return (
    <div className="relative z-10 px-4 py-16 sm:py-24 flex flex-col items-center">
      <div className="mb-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-palette-vivid-purple">
          Interpretix
        </h2>
      </div>
      
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center mb-6">
        <span className="text-palette-vivid-purple">
          Bienvenue
        </span>
      </h1>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-6">
        <Button asChild size="lg" className="flex-1">
          <Link to="/admin/login" className="flex items-center justify-center gap-2">
            <Building className="w-5 h-5" />
            <span>Espace Administrateur</span>
          </Link>
        </Button>
        
        <Button asChild variant="secondary" size="lg" className="flex-1">
          <Link to="/interpreter/login" className="flex items-center justify-center gap-2">
            <Headset className="w-5 h-5" />
            <span>Espace Interprète</span>
          </Link>
        </Button>
      </div>
    </div>
  );
};
