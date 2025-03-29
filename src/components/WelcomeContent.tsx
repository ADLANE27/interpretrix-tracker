
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building, Headset, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

export const WelcomeContent = () => {
  const isMobile = useIsMobile();
  
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
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Hero Background Image with Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&q=80')] 
                    bg-cover bg-center"
          style={{ opacity: 0.7 }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-palette-vivid-purple/80 via-palette-ocean-blue/60 to-transparent" />
      </div>
      
      {/* Hero Section with Centered Content */}
      <div className="flex-1 flex items-center justify-center relative z-10 overflow-hidden pb-16">
        {/* Main content container - reduced vertical spacing */}
        <motion.div 
          className="w-full max-w-6xl mx-auto px-6 py-4 text-center"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          {/* Logo Animation - increased size */}
          <motion.div 
            className="mb-8 md:mb-12"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <img 
              src="/lovable-uploads/6e8ba30f-137d-474a-9c54-fd5f712b2b41.png" 
              alt="Logo" 
              className="h-40 md:h-64 mx-auto filter drop-shadow-lg" 
            />
          </motion.div>
          
          {/* Title - reduced margins */}
          <motion.div 
            variants={item}
            className="mb-8 md:mb-12 max-w-3xl mx-auto"
          >
            <h1 className="text-3xl md:text-5xl font-bold mb-4 text-white drop-shadow-md">
              Interprétation Professionnelle
            </h1>
            <p className="text-base md:text-lg text-white/90 max-w-xl mx-auto drop-shadow">
              Connectez-vous à notre plateforme dédiée aux professionnels de l'interprétation
            </p>
          </motion.div>
          
          {/* Buttons - with glass effect */}
          <motion.div 
            variants={item}
            className="flex flex-col sm:flex-row justify-center gap-4 mb-6"
          >
            <Button 
              asChild 
              size="lg" 
              variant="default"
              className="text-lg px-8 py-6 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 shadow-lg hover:bg-white/30 transition-all duration-300 group"
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
              className="text-lg px-8 py-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:bg-white/20 transition-all duration-300 group"
            >
              <Link to="/interpreter/login" className="flex items-center gap-3">
                <Headset className="w-5 h-5" />
                <span>Espace Interprète</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </motion.div>
          
          {/* Decorative Elements */}
          <motion.div 
            className="absolute bottom-0 left-0 w-40 h-40 bg-palette-soft-purple opacity-30 rounded-full -ml-20 -mb-20 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 0.5, duration: 1 }}
          />
          
          <motion.div 
            className="absolute top-1/4 right-0 w-60 h-60 bg-palette-ocean-blue opacity-20 rounded-full -mr-20 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            transition={{ delay: 0.7, duration: 1 }}
          />
        </motion.div>
      </div>
      
      {/* Footer - with glass effect */}
      <motion.footer 
        className="py-4 text-center text-white/80 text-sm relative z-10 bg-black/20 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <p className="px-4">Interpretix™ 2025 – Par AFTraduction, protégé par le droit d'auteur conformément à l'article L112-2 du Code de la propriété intellectuelle. Toute reproduction ou utilisation non autorisée est interdite.</p>
      </motion.footer>
    </div>
  );
};
