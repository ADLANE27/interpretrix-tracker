
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building, Headset, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export const WelcomeContent = () => {
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };
  
  const item = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section with Centered Content */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Background with subtle animation */}
        <motion.div 
          className="absolute inset-0 -z-10 opacity-20"
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.2 }}
          transition={{ duration: 1.5 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-palette-soft-blue via-white to-palette-soft-purple" />
        </motion.div>
        
        {/* Main content container */}
        <motion.div 
          className="w-full max-w-6xl mx-auto px-6 py-8 text-center"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          {/* Logo Animation */}
          <motion.div 
            className="mb-16"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <img 
              src="/lovable-uploads/6e8ba30f-137d-474a-9c54-fd5f712b2b41.png" 
              alt="Logo" 
              className="h-32 md:h-40 mx-auto" 
            />
          </motion.div>
          
          {/* Title */}
          <motion.div 
            variants={item}
            className="mb-16 max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-palette-ocean-blue to-palette-vivid-purple bg-clip-text text-transparent">
              Interprétation Professionnelle
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
              Connectez-vous à notre plateforme dédiée aux professionnels de l'interprétation
            </p>
          </motion.div>
          
          {/* Buttons with enhanced visibility */}
          <motion.div 
            variants={item}
            className="flex flex-col sm:flex-row justify-center gap-8 mb-12"
          >
            <Button 
              asChild 
              size="lg" 
              variant="default"
              className="text-lg px-10 py-7 rounded-xl shadow-lg shadow-palette-vivid-purple/20 hover:shadow-palette-vivid-purple/40 transition-all duration-300 group"
            >
              <Link to="/admin/login" className="flex items-center gap-3">
                <Building className="w-6 h-6" />
                <span>Espace Administrateur</span>
                <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            
            <Button 
              asChild 
              size="lg" 
              variant="secondary"
              className="text-lg px-10 py-7 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <Link to="/interpreter/login" className="flex items-center gap-3">
                <Headset className="w-6 h-6" />
                <span>Espace Interprète</span>
                <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </motion.div>
          
          {/* Decorative Elements */}
          <motion.div 
            className="absolute bottom-0 left-0 w-40 h-40 bg-palette-soft-purple opacity-30 rounded-full -ml-20 -mb-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 0.5, duration: 1 }}
          />
          
          <motion.div 
            className="absolute top-1/4 right-0 w-60 h-60 bg-palette-ocean-blue opacity-20 rounded-full -mr-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            transition={{ delay: 0.7, duration: 1 }}
          />
        </motion.div>
      </div>
      
      {/* Footer */}
      <motion.footer 
        className="py-6 text-center text-slate-500 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <p>© {new Date().getFullYear()} Interprétation professionnelle. Tous droits réservés.</p>
      </motion.footer>
    </div>
  );
};
