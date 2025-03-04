
import { Languages } from "lucide-react";
import { motion } from "framer-motion";

export const Hero = () => {
  return (
    <div className="relative overflow-hidden">
      <div 
        className="absolute inset-0 z-0" 
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=2000')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.3)"
        }}
      />
      
      <div className="relative z-10 px-4 py-32 sm:py-48 flex flex-col items-center justify-center text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Languages className="h-20 w-20 mb-8 text-yellow-400" />
          <h1 className="text-5xl sm:text-7xl font-bold mb-6 tracking-tight">
            Interpretix
          </h1>
          <p className="text-xl sm:text-2xl mb-8 max-w-2xl mx-auto text-gray-200 font-light">
            Disponibilité en temps réel et gestion de missions
          </p>
        </motion.div>
      </div>
    </div>
  );
};
