
import { InterpreterLoginForm } from "@/components/auth/InterpreterLoginForm";
import { LanguageIcon, GlobeIcon, Globe2 } from "lucide-react";
import { motion } from "framer-motion";

const InterpreterLogin = () => {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-palette-soft-blue via-white to-palette-soft-purple -z-10" />
      
      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <motion.div 
          className="absolute top-1/4 left-1/5 w-64 h-64 rounded-full bg-gradient-to-r from-palette-purple/20 to-palette-ocean-blue/10 blur-2xl"
          animate={{ 
            y: [0, 15, 0], 
            opacity: [0.5, 0.7, 0.5] 
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 8,
            ease: "easeInOut" 
          }}
        />
        <motion.div 
          className="absolute bottom-1/3 right-1/4 w-72 h-72 rounded-full bg-gradient-to-l from-palette-soft-purple/20 to-palette-soft-blue/10 blur-3xl"
          animate={{ 
            y: [0, -20, 0], 
            opacity: [0.4, 0.6, 0.4] 
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 10,
            ease: "easeInOut",
            delay: 1 
          }}
        />
      </div>
      
      {/* Decorative pattern */}
      <div className="absolute inset-0 bg-grid-black/[0.02] -z-10" />
      
      {/* Floating language icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-5">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: `${15 + i * 12}%`,
              left: `${5 + i * 15}%`,
              opacity: 0.4
            }}
            animate={{
              y: [0, i % 2 === 0 ? -15 : 15, 0],
              x: [0, i % 3 === 0 ? 10 : -10, 0],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{
              repeat: Infinity,
              duration: 5 + i,
              ease: "easeInOut",
              delay: i * 0.5
            }}
          >
            <Globe2 
              size={i % 2 === 0 ? 24 : 32} 
              className="text-palette-ocean-blue/60" 
            />
          </motion.div>
        ))}
      </div>
      
      {/* Main content - Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <InterpreterLoginForm />
      </motion.div>
    </div>
  );
};

export default InterpreterLogin;
