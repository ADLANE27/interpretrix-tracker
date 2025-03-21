
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building, Headset, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export const WelcomeContent = () => {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <motion.header 
        className="py-8 px-8 md:px-16 flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex items-center"
        >
          <img 
            src="/lovable-uploads/6e8ba30f-137d-474a-9c54-fd5f712b2b41.png" 
            alt="Logo" 
            className="h-16 md:h-20 w-auto" 
          />
        </motion.div>
      </motion.header>
      
      {/* Hero Section */}
      <motion.div 
        className="flex-1 flex flex-col items-center justify-center text-center px-8 md:px-16 py-12"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div 
          className="max-w-4xl mx-auto"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={item} className="mb-12">
            <motion.div 
              className="flex justify-center mb-12"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
            >
              <img 
                src="/lovable-uploads/6e8ba30f-137d-474a-9c54-fd5f712b2b41.png" 
                alt="Logo Principal" 
                className="h-40 md:h-52 w-auto"
              />
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-6xl font-bold mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <span className="text-gradient-primary">Interprétation</span>
              <br/>
              <span className="text-gradient-secondary">Professionnelle</span>
            </motion.h1>
          </motion.div>
        
          <motion.div 
            className="flex flex-col sm:flex-row justify-center gap-6 mb-16"
            variants={fadeIn}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <Button asChild size="lg" className="text-lg h-16 w-64 shadow-lg">
              <Link to="/admin/login" className="flex items-center justify-center gap-2">
                <Building className="w-6 h-6" />
                <span>Espace Administrateur</span>
                <ChevronRight className="w-5 h-5 ml-1" />
              </Link>
            </Button>
            
            <Button asChild variant="secondary" size="lg" className="text-lg h-16 w-64 shadow-lg">
              <Link to="/interpreter/login" className="flex items-center justify-center gap-2">
                <Headset className="w-6 h-6" />
                <span>Espace Interprète</span>
                <ChevronRight className="w-5 h-5 ml-1" />
              </Link>
            </Button>
          </motion.div>
          
          <motion.div
            className="absolute bottom-0 inset-x-0 h-1/2 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 1, duration: 1 }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-palette-soft-purple to-transparent" />
          </motion.div>
        </motion.div>
      </motion.div>
      
      {/* Footer */}
      <motion.footer 
        className="text-center py-8 text-slate-600 dark:text-slate-400 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
      >
        <div className="max-w-6xl mx-auto px-4">
          <p>© {new Date().getFullYear()} Interprétation professionnelle. Tous droits réservés.</p>
        </div>
      </motion.footer>
    </div>
  );
};
