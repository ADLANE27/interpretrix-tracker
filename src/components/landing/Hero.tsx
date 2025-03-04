
import { Languages } from "lucide-react";
import { motion } from "framer-motion";

export const Hero = () => {
  return (
    <div className="relative overflow-hidden">
      <div 
        className="absolute inset-0 z-0" 
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=2000')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.3)"
        }}
      />
      
      <div className="relative z-10 px-4 py-16 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Languages className="h-16 w-16 mb-6 text-yellow-400" />
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            AFTraduction
          </h1>
          <p className="text-xl sm:text-2xl mb-8 max-w-2xl mx-auto text-gray-200">
            Services professionnels d'interprétation et de traduction
          </p>
        </motion.div>
      </div>
    </div>
  );
};
