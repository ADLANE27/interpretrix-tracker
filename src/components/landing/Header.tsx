
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
            src="/lovable-uploads/b5871352-bd6c-4c19-9434-bcf62d8d01e1.png" 
            alt="AFTraduction Logo" 
            className="w-12 h-12 object-contain"
          />
          <h1 className="text-2xl font-semibold tracking-tight">AFTraduction</h1>
        </div>
      </motion.div>
    </header>
  );
};
