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
    <div className="min-h-screen flex flex-col relative">
      {/* Background animation layer */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Large floating circles */}
        <div className="absolute inset-0">
          {[...Array(6)].map((_, index) => (
            <motion.div
              key={`circle-${index}`}
              className="absolute rounded-full bg-gradient-to-br from-palette-vivid-purple/10 to-palette-ocean-blue/20"
              style={{
                width: `${Math.random() * 600 + 300}px`,
                height: `${Math.random() * 600 + 300}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0.2, 0.4, 0.2],
                scale: [0.8, 1.2, 0.8],
                x: [0, Math.random() * 150 - 75, 0],
                y: [0, Math.random() * 150 - 75, 0],
              }}
              transition={{
                duration: Math.random() * 25 + 20,
                repeat: Infinity,
                delay: index * 2,
              }}
            />
          ))}
        </div>

        {/* Animated words in different languages with improved visibility */}
        <AnimatePresence>
          {interpreterWords.map((word, index) => (
            <motion.div
              key={`${word}-${index}`}
              initial={{
                opacity: 0,
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                scale: 0.5
              }}
              animate={{
                opacity: [0, 0.8, 0],
                x: [
                  Math.random() * window.innerWidth,
                  Math.random() * window.innerWidth,
                  Math.random() * window.innerWidth
                ],
                y: [
                  Math.random() * window.innerHeight,
                  Math.random() * window.innerHeight,
                  Math.random() * window.innerHeight
                ],
                scale: [0.5, 1.8, 0.5],
                rotate: [0, Math.random() * 360 - 180]
              }}
              transition={{
                duration: 30,
                repeat: Infinity,
                delay: index * 4,
                ease: "easeInOut"
              }}
              className="absolute text-3xl md:text-6xl font-light text-palette-ocean-blue/30 whitespace-nowrap"
            >
              {word}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Enhanced floating particles */}
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute rounded-full bg-gradient-to-r from-palette-vivid-purple/30 to-palette-ocean-blue/30"
            style={{
              width: Math.random() * 8 + 3,
              height: Math.random() * 8 + 3,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, Math.random() * 150 - 75, 0],
              x: [0, Math.random() * 150 - 75, 0],
              opacity: [0, 0.7, 0],
              scale: [0, 1.2, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: Math.random() * 12 + 8,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Enhanced Logo */}
      <div className="absolute top-6 left-6 z-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          whileHover={{ scale: 1.05 }}
          className="glass-card p-4 rounded-2xl"
        >
          <img 
            src="/lovable-uploads/6e8ba30f-137d-474a-9c54-fd5f712b2b41.png" 
            alt="Logo" 
            className="h-24 md:h-40 hover:filter hover:brightness-110 transition-all duration-300" 
          />
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center relative overflow-hidden pb-16">
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
            className="mb-8 md:mb-12"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Remove the logo from this section */}
          </motion.div>
          
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
