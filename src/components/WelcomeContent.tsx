
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building, Headset } from "lucide-react";
import { motion } from "framer-motion";

export const WelcomeContent = () => {
  return (
    <div className="relative z-10 px-4 py-16 sm:py-24 flex flex-col items-center">
      <motion.div 
        className="mb-8 bg-white p-4 rounded-lg"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          duration: 0.8,
          ease: [0.25, 0.1, 0.25, 1.0],
        }}
        whileHover={{ 
          scale: 1.05,
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
          transition: { duration: 0.3 }
        }}
      >
        <motion.img 
          src="/lovable-uploads/6e8ba30f-137d-474a-9c54-fd5f712b2b41.png" 
          alt="Interpretix Logo" 
          className="h-32 sm:h-48 w-auto"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 10,
            delay: 0.3
          }}
        />
      </motion.div>
      
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center mb-6">
        <motion.span 
          className="text-palette-vivid-purple"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          Bienvenue
        </motion.span>
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
