
import React from 'react';
import { motion } from 'framer-motion';

export const Header = () => {
  return (
    <header className="w-full py-6 px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto flex justify-between items-center"
      >
        <div className="flex items-center gap-2">
          <img 
            src="/lovable-uploads/b3e14f6e-4d88-4e03-9c42-fff9ef6c8608.png" 
            alt="Interpretix Logo" 
            className="w-32 h-12 object-contain"
          />
        </div>
      </motion.div>
    </header>
  );
};
