import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building, Headset, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  const interpreterWords = [
    "Interprète", "Interpreter", "Intérprete", "Dolmetscher", 
    "Interprete", "通訳", "口译员", "المترجم", "Tolk",
    "Переводчик", "통역사", "Çevirmen", "מתורגמן"
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <AnimatePresence>
          {interpreterWords.map((word, index) => (
            <motion.div
              key={`${word}-${index}`}
              initial={{
                opacity: 0,
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight
              }}
              animate={{
                opacity: [0, 0.3, 0],
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                scale: [0.8, 1.2, 0.8],
                rotate: [0, Math.random() * 360]
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                delay: index * 2,
                ease: "linear"
              }}
              className="absolute text-2xl md:text-4xl font-light text-palette-ocean-blue/10 whitespace-nowrap"
            >
              {word}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex-1 flex items-center justify-center relative overflow-hidden pb-16">
        <motion.div 
          className="absolute inset-0 -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white via-palette-soft-blue/30 to-palette-soft-purple/40" />
        </motion.div>
        
        <motion.div 
          className="w-full max-w-6xl mx-auto px-6 py-4 text-center relative z-10"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="mb-8 md:mb-12"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <img 
              src="/lovable-uploads/6e8ba30f-137d-474a-9c54-fd5f712b2b41.png" 
              alt="Logo" 
              className="h-40 md:h-64 mx-auto" 
            />
          </motion.div>
          
          <motion.div 
            variants={item}
            className="mb-8 md:mb-12 max-w-3xl mx-auto backdrop-blur-sm py-6 px-4 rounded-2xl"
          >
            <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-palette-ocean-blue to-palette-vivid-purple bg-clip-text text-transparent">
              Interprétation Professionnelle
            </h1>
            <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
              Connectez-vous à notre plateforme dédiée aux professionnels de l'interprétation
            </p>
          </motion.div>
          
          <motion.div 
            variants={item}
            className="flex flex-col sm:flex-row justify-center gap-4 mb-6"
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
      
      <motion.footer 
        className="py-4 text-center text-slate-500 text-sm backdrop-blur-sm bg-white/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <p>Interpretix™ 2025 – Par AFTraduction, protégé par le droit d'auteur conformément à l'article L112-2 du Code de la propriété intellectuelle. Toute reproduction ou utilisation non autorisée est interdite.</p>
      </motion.footer>
    </div>
  );
};
