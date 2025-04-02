
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building, Headset, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export const WelcomeContent = () => {
  // Animation variants
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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Hero Section with Enhanced Visual Design */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Enhanced Background with Dynamic Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-palette-soft-blue via-white to-palette-soft-purple opacity-50 -z-10" />
        
        {/* Animated Background Elements */}
        <motion.div 
          className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-palette-ocean-blue/10 -z-10"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: [0.8, 1.2, 0.8], 
            opacity: [0, 0.2, 0],
            x: [0, 20, 0],
            y: [0, -20, 0]
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity,
            repeatType: "reverse" 
          }}
        />
        
        <motion.div 
          className="absolute bottom-20 left-[15%] w-80 h-80 rounded-full bg-palette-vivid-purple/10 -z-10"
          initial={{ scale: 1, opacity: 0 }}
          animate={{ 
            scale: [1, 1.3, 1], 
            opacity: [0, 0.15, 0],
            x: [0, -30, 0],
            y: [0, 30, 0]
          }}
          transition={{ 
            duration: 18, 
            repeat: Infinity,
            repeatType: "reverse",
            delay: 1
          }}
        />
        
        {/* Main content container */}
        <motion.div 
          className="w-full max-w-5xl mx-auto px-6 text-center relative z-10"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          {/* Logo with Enhanced Animation */}
          <motion.div 
            className="mb-8 md:mb-10"
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <img 
              src="/lovable-uploads/6e8ba30f-137d-474a-9c54-fd5f712b2b41.png" 
              alt="Logo" 
              className="h-32 md:h-48 mx-auto filter drop-shadow-lg" 
            />
          </motion.div>
          
          {/* Enhanced Typography */}
          <motion.div 
            variants={item}
            className="mb-10 md:mb-12 max-w-3xl mx-auto"
          >
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-palette-vivid-purple to-palette-ocean-blue bg-clip-text text-transparent tracking-tight">
              Interprétation Professionnelle
            </h1>
            <p className="text-base md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-light">
              Connectez-vous à notre plateforme dédiée aux professionnels de l'interprétation
            </p>
          </motion.div>
          
          {/* Decorative line separator */}
          <motion.div
            className="w-24 h-1 bg-gradient-to-r from-palette-vivid-purple to-palette-ocean-blue rounded-full mx-auto mb-10"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 96, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          />
          
          {/* Enhanced Buttons with Visual Feedback */}
          <motion.div 
            variants={item}
            className="flex flex-col sm:flex-row justify-center gap-6"
          >
            {/* Admin Button */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-palette-vivid-purple to-palette-ocean-blue rounded-xl blur-md opacity-70 group-hover:opacity-100 transition-all duration-300 -z-10" />
              <Button 
                asChild 
                size="lg" 
                variant="default"
                className="text-lg px-8 py-6 rounded-xl shadow-lg shadow-palette-vivid-purple/20 hover:shadow-palette-vivid-purple/40 transition-all duration-300 group w-full sm:w-auto"
              >
                <Link to="/admin/login" className="flex items-center gap-3 justify-center">
                  <div className="bg-white/20 rounded-full p-1.5">
                    <Building className="w-5 h-5" />
                  </div>
                  <span>Espace Administrateur</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </motion.div>
            
            {/* Interpreter Button */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-palette-bright-orange to-palette-magenta-pink rounded-xl blur-md opacity-70 group-hover:opacity-100 transition-all duration-300 -z-10" />
              <Button 
                asChild 
                size="lg" 
                variant="secondary"
                className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group w-full sm:w-auto"
              >
                <Link to="/interpreter/login" className="flex items-center gap-3 justify-center">
                  <div className="bg-white/20 rounded-full p-1.5">
                    <Headset className="w-5 h-5" />
                  </div>
                  <span>Espace Interprète</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
          
          {/* Language Decoration Elements */}
          <motion.div
            className="absolute top-10 right-[5%] opacity-10 hidden md:block"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 0.1, x: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            <div className="text-6xl font-light rotate-12">语言</div>
          </motion.div>
          
          <motion.div
            className="absolute bottom-10 left-[5%] opacity-10 hidden md:block"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 0.1, x: 0 }}
            transition={{ delay: 1.5, duration: 0.8 }}
          >
            <div className="text-6xl font-light -rotate-12">words</div>
          </motion.div>
        </motion.div>
      </div>
      
      {/* Simple Footer */}
      <motion.div
        className="py-4 text-center text-sm text-gray-500"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.5 }}
      >
        <p>© {new Date().getFullYear()} Interpretix · Tous droits réservés</p>
      </motion.div>
    </div>
  );
};
