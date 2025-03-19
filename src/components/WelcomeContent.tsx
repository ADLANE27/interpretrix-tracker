
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building, Globe } from "lucide-react";

export const WelcomeContent = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="relative z-10 px-4 py-16 sm:py-24 flex flex-col items-center"
    >
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center mb-6"
      >
        <span className="bg-gradient-to-r from-palette-vivid-purple to-palette-ocean-blue bg-clip-text text-transparent">
          AFTraduction
        </span>
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.7 }}
        className="text-lg sm:text-xl text-center text-slate-700 dark:text-slate-300 max-w-2xl mb-10"
      >
        Plateforme d'interprétation professionnelle pour connecter les meilleurs interprètes avec les clients du monde entier
      </motion.p>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="flex flex-col sm:flex-row gap-4 w-full max-w-md"
      >
        <Button asChild size="lg" className="flex-1 shadow-lg">
          <Link to="/admin/login" className="flex items-center justify-center gap-2">
            <Building className="w-5 h-5" />
            <span>Espace Administrateur</span>
          </Link>
        </Button>
        
        <Button asChild variant="secondary" size="lg" className="flex-1 shadow-lg">
          <Link to="/interpreter/login" className="flex items-center justify-center gap-2">
            <Globe className="w-5 h-5" />
            <span>Espace Interprète</span>
          </Link>
        </Button>
      </motion.div>
    </motion.div>
  );
};
