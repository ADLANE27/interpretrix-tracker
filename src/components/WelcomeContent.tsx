
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building, Headset, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { WorldMap } from "@/components/ui/world-map";

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

  const connectionDots = [
    {
      start: { lat: 48.8566, lng: 2.3522 }, // Paris
      end: { lat: 51.5074, lng: -0.1278 }, // London
    },
    {
      start: { lat: 48.8566, lng: 2.3522 }, // Paris
      end: { lat: 52.5200, lng: 13.4050 }, // Berlin
    },
    {
      start: { lat: 48.8566, lng: 2.3522 }, // Paris
      end: { lat: 41.9028, lng: 12.4964 }, // Rome
    },
    {
      start: { lat: 48.8566, lng: 2.3522 }, // Paris
      end: { lat: 40.4168, lng: -3.7038 }, // Madrid
    },
    {
      start: { lat: 48.8566, lng: 2.3522 }, // Paris
      end: { lat: 55.7558, lng: 37.6173 }, // Moscow
    },
  ];

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Background with WorldMap */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
        <WorldMap dots={connectionDots} lineColor="#8B5CF6" />
      </div>

      {/* Logo without box and shadow */}
      <div className="absolute top-6 left-6 z-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          whileHover={{ scale: 1.05 }}
        >
          <img 
            src="/lovable-uploads/6e8ba30f-137d-474a-9c54-fd5f712b2b41.png" 
            alt="Logo" 
            className="h-24 md:h-40 transition-all duration-300" 
          />
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        <motion.div 
          className="absolute inset-0 -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white via-palette-soft-blue/50 to-palette-soft-purple/60" />
        </motion.div>
        
        <motion.div 
          className="w-full max-w-6xl mx-auto px-6 py-4 text-center relative z-10"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            variants={item}
            className="mb-8 md:mb-12 max-w-3xl mx-auto backdrop-blur-sm py-6 px-4 rounded-2xl"
          >
            <motion.h1 
              className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-palette-ocean-blue to-palette-vivid-purple bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              style={{ backgroundSize: '200% auto' }}
            >
              Interprétation Professionnelle
            </motion.h1>
            <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
              Connectez-vous à notre plateforme dédiée aux professionnels de l'interprétation
            </p>
          </motion.div>
          
          <motion.div 
            variants={item}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <Button 
              asChild 
              size="lg" 
              variant="default"
              className="text-lg px-8 py-6 rounded-xl shadow-lg shadow-palette-vivid-purple/20 hover:shadow-palette-vivid-purple/40 transition-all duration-300 group backdrop-blur-sm bg-white/80"
            >
              <Link to="/admin/login" className="flex items-center gap-3">
                <Building className="w-5 h-5" />
                <span>Espace Administrateur</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            
            <Button 
              asChild 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group backdrop-blur-sm bg-white/60"
            >
              <Link to="/interpreter/login" className="flex items-center gap-3">
                <Headset className="w-5 h-5" />
                <span>Espace Interprète</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
