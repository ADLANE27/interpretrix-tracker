
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building, Globe } from "lucide-react";

export const WelcomeContent = () => {
  return (
    <div className="relative z-10 px-4 py-16 sm:py-24 flex flex-col items-center">
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center mb-6">
        <span className="text-palette-vivid-purple">
          Bienvenu
        </span>
      </h1>
      
      <p className="text-lg sm:text-xl text-center text-slate-700 dark:text-slate-300 max-w-2xl mb-10">
        Plateforme d'interprétation professionnelle pour connecter les meilleurs interprètes avec les clients du monde entier
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Button asChild size="lg" className="flex-1">
          <Link to="/admin/login" className="flex items-center justify-center gap-2">
            <Building className="w-5 h-5" />
            <span>Espace Administrateur</span>
          </Link>
        </Button>
        
        <Button asChild variant="secondary" size="lg" className="flex-1">
          <Link to="/interpreter/login" className="flex items-center justify-center gap-2">
            <Globe className="w-5 h-5" />
            <span>Espace Interprète</span>
          </Link>
        </Button>
      </div>
    </div>
  );
};
