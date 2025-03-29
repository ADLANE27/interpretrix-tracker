
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building, Headset, ChevronRight, Map as MapIcon, Flag } from "lucide-react";
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
  
  // Country SVG paths - simplified outlines for various countries
  const countryPaths = [
    // France
    "M499.2,171.9l0.7,1.4l-0.1,1.1l-2.2,2l-2.9,0.4l-1.2,1.8l-1.3-0.8l-1.9,2l-0.4,2.2l1.3,3.3l-0.8,1l0.3,1.4l-1.3,2.2 l1.3,2.9l-1.9,1.6l0.5,1l-0.5,2.3l1,1.4l-0.2,1.4l1,1.2l-1.6,1.7l0.8,0.5l-0.6,2.5l-2.5-0.4l-0.7,0.9l-3.5-2.7l-1,0.5l-2.2-1.2 l-1.7,1.9l-0.8-0.1l-0.6-1.9l-2.8,0l-0.7-2.3l-2.8-0.5l1-2.4l-0.9-1.5l0.2-1.2l-0.4-3l-2.4-1.6l-1.2-2.7l1.6-1.8l0.5-0.7l1.4,0.1 l0,0l2.5-0.2l-0.6-2.2l1.7-1.9l1.3-2.2l3.2-0.9l1.4,1.1l1.3-0.1l2.5,2.3l0.7-1.7l1.5,0.7h2.3l0.8-1.1l3,0.6l0.5-0.5l2.2,1.1 L499.2,171.9z",
    // United Kingdom
    "M487.8,154.4l-1.2,2.2l-1.5-0.7l-1.5,3.3l2.3,3.7l-0.4,1.8l-2.9,1.1l-3.9-0.7l3.1-3.1l-0.7-1.4l-2.9,0l0.7-2.2l3-1 l0.5-2.7L487.8,154.4z M472,146.4l-3.1,2.8l-1-0.2l-3.2,3.5l0.3,3.2l2.6,0.2l3-1.5l0.3,2.5l-1.4,2.6l1.5,4.4l3.1,1.4l3-0.4 l-0.1-2.8l-2.2-2.7l0.2-3l-1-3.1l5.1-2.4l1.6,1.2l4-0.7l3.2,0.4l-2.8,2.8l2.4,0.8l2.4,5l3.3,2l0.3,3.5l4.1-1.3l1.5,2.9l-1.1,2.8 l1.4,1.2l2.4-0.9l1.8,2.2h2.9l0.8-1.2l2.4,0.4l0.6-1.9l-1.8-2.1l0.5-2.3l-0.8-1.4l-2.9-0.8l-0.9-1.4l0.6-2l-0.7-1.7l1.3-1.4 l-0.2-0.7l-2.4,0.5l-1.1-1.5l0.1-1.7l-1.9-2.5l-0.1-0.7l-0.1,0l-2.5-1.3l-0.1-1.1l-2.5,1.1l-0.4-0.8l-1-0.1l-1.1,1.1l-1.5-0.4 l-2.1,1.2l-1.8,0l-1.1-1.4l-0.2-0.1l-1.5,0.3l-0.3-0.8l-1.8,0.8l-2.1-0.9L472,146.4z",
    // Germany
    "M521.2,191.1l-2.4-1.7l-0.6-1.6l-0.7-0.8l-2.5,0.5l-3.3-1l-1.7,0.6l-3.4-0.8l-2.9,0.4l-0.5-1.1l-1.3-0.3l-1.1-1.3l-1.1,1.5 l-3.5,0.3l-0.8,1.5l-0.5-0.1l-0.3-1.6l-1.9-0.9l0.6-2.5l-0.8-0.5l1.6-1.7l-1-1.2l0.2-1.4l-1-1.4l0.5-2.3l-0.5-1l1.9-1.6 l-1.3-2.9l1.3-2.2l-0.3-1.4l0.8-1l-1.3-3.3l0.4-2.2l-1.7-0.7l0.1-2.5l1.3-2.2l-0.1-1.1l-0.7-1.4l-0.7-5.1l-0.9-0.1l-0.5-1 l-2.5-0.6l-1.3,0.1l-1.5-1.1l1-2.6l-0.2-1.8l-2.5-2.5l-1.7-0.5l-0.7,0.6l-2.5-3.4l-1,0.2l-2.3-2.1l-0.4-3.1l-3.6-3.5l-3.6,0.8 l-1.9-1.3l-2.5,1.3l-4.4-2.1l0.7-1.9l1.9-1.3l-0.3-1.4l2.9-0.5l0.9-1.2l0.1-1.6l-1.7-1.3l-0.2-2.2l2.4-1.5l1.7-1.5l1.5-0.3 l2-2.3l2.2,0.9l2.2-0.9l0.7,1.2l2.7,0.9l0.5,1.8h4.5l1-1.4l3.1,0.5l3.9,2.8l0.1,1.2l2.4,0.2l3.7-2.1l0.3,1.8l1.9,0.7l1.1-1.3 l1.1,0.3l3.2-1.4l2.3,0.3l1.7,1.1l0.5,1.5l-0.5,1.4l1.1,0.9l2,3.8l-1.2,0.8l-0.9-0.8l-0.6,0.8l-1-0.7l-1,0.3l-0.3,1.2l-0.7-0.8 l-1.2-0.2l-0.1,1.3l-1.3,0.4l-0.2-0.6l-2.6-0.2l-0.7,0.4l0.2,2.1l-1.5-0.3l-0.2-0.7l-2.9-0.1l-0.8-1.5l-1.9,2.1l-1-0.5l-1-2.7 l-0.3-0.9l-1.3,0.5l-1.2-0.1l-0.9,0.8h-2.6l-0.1-2.1l-2.6-0.4l-1.2,0.6l-1.2,3.3l-0.9,0.3l0,0l-3.7,1.4l-0.4,0.4l0,0l0.9,1 l0.1,1.3l-0.7,1.6l2.3,1.5l0.2,1.3l-0.5,0.5l1.5,2.3l-0.3,1.3l0.6,0.7l-0.8,1l2.1,2.8l-2.9,0.2l0.08,2l2.72,1.6l-0.9,2.4l2.8,0.5 l0.7,2.3l2.8,0l0.6,1.9l1.2,0.1l1.7-1.9l2.2,1.2l1-0.5l3.5,2.7l0.7-0.9l2.5,0.4l1,2.3l-0.2,2.2l2.4,3.5l2.6,2.8l3.7,1.4l1.8-0.4 l2.9,2l-1,1.5l0.4,2.4l-1.6,1.7l2.1,2.6l-0.3,1.2l-1.5-0.3l0.2,1.6L521.2,191.1z",
    // Italy
    "M546.9,229.8l-1-5.8l-3-1.9l-3.1-1l-0.8-1.1l-2.8-0.1l-2.7-2.2l-2.3-2.5l-4.2-1.1l-2.1,0.9l-2.6-0.9l-0.8-1.1l-3.5-0.8 l-1.7-1.3l0.1-1.9l-0.7-2.1l-1.7-0.7l-0.9-1.1l0.8-1.7l-0.7-1.8l0.1-2.5l1.2-0.5l-0.4-1.4l3.9-0.2l1-1.4l3.3-0.7l0.5-2.7l2.1-0.1 l0.3-1.7l3-1.1l2.4-2.1l2.5,0.4l2.4-1.5l2.3-0.2l0.2-0.9l1.9,0.8l1.1-0.4l1.1-1.4l-0.8-2.2l0.7-1.9l1.8,1.2l1.3-0.8l-0.6-2.2 l2-1.7l1.7,0.5l-0.1,2.4l-1.7,0.7l0.2,2.6l1.4,2.2l-0.1,1.1l-1.2,0.5l-0.6,1.6l2.3,1.2l1.2,2.2l2.7,0.4l0.9,1.9l0.9-0.9l2.5,0.8 l2.6-0.2l1.2,1.7l-0.3,1.3l0.7,1.6l-1.7,1.3l0.7,2.6l-0.5,1.8l1.2,0.3l0.8,2l-0.8,1l-0.2,4.9l-0.8,0.6l-0.9,3.5l-1.1,0.7l-0.1,1 l-1.4,0.7l0.2,1.5l-2.5,2.4l-2-0.2l-2.2,0.8l-1.2,2.8l0.8,1.3l-0.7,0.7l-2.9,0.3L546.9,229.8z",
    // Spain
    "M444.8,237.1l-0.2,2l-1.9,1.5l-3-0.1l-3,0.5l-0.5,0.8l-3.1,0.4l-2.9,2.8l-5.5-0.4l-4-0.9l-1-3.1l-2.9-0.4l-1.9-2.2l-3.3-0.1 l-1.7-1.5l-1,0.7l-2.5-0.3l-2-3.5l-3.1-0.1l-1.8-1.1l-2.1,0.9l-3.4-1.6l-1.7,1.5l0.7-3.1l3.3-2.6l1.7-3.7l2.1-1.1l2.3,0.1 l1.9-1.7l-0.8-2.9l-2-0.5l0-3.3l1.9-1.6l-0.2-1.8l1-2.4l-1-3.1l2.5-1.3l8.3-1.4l1.1,1l3.1-0.5l6.3,0l1.1-0.8h3l1.1-1.1l3.3,0.6 l2.8,0l1.4-2.1l7.8,1l0.8-0.6l5.2,1.1l1,2.3l2.2,2.1l3-0.2l2.4,1.1l0.2,1.2l-2.8,2.5l-1.8,0.5l-0.3,2.3l-5,0.3l-1.3,3.2 l0.9,1.3l-0.9,4.2l-5.3-0.3l-2.3,0.7l2.5,2.4l-2.5,1.2l-2,2.3l-2.6,0.2l-0.5-0.8l-2,1.8L444.8,237.1z",
  ];

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Background animation layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Country maps instead of floating circles */}
        <div className="absolute inset-0">
          {countryPaths.map((path, index) => (
            <motion.svg
              key={`country-${index}`}
              className="absolute"
              viewBox="420 140 150 150"
              style={{
                width: `${Math.random() * 400 + 300}px`,
                height: `${Math.random() * 400 + 300}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              initial={{ opacity: 0, scale: 0.8, rotate: Math.random() * 360 }}
              animate={{
                opacity: [0.1, 0.2, 0.1],
                scale: [0.8, 1.0, 0.8],
                x: [0, Math.random() * 100 - 50, 0],
                y: [0, Math.random() * 100 - 50, 0],
                rotate: [0, Math.random() * 20 - 10, 0],
              }}
              transition={{
                duration: Math.random() * 25 + 20,
                repeat: Infinity,
                delay: index * 2,
              }}
            >
              <motion.path
                d={path}
                fill="none"
                stroke={`url(#gradient-${index})`}
                strokeWidth="1.5"
                strokeDasharray="5,5"
              />
              <defs>
                <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={index % 2 === 0 ? "#0EA5E9" : "#8B5CF6"} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={index % 2 === 0 ? "#8B5CF6" : "#0EA5E9"} stopOpacity="0.3" />
                </linearGradient>
              </defs>
            </motion.svg>
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
            className="h-24 md:h-40 hover:filter hover:brightness-110 transition-all duration-300" 
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
