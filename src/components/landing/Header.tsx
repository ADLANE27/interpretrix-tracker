
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
          <img src="/icon.svg" alt="Logo" className="w-8 h-8" />
          <h1 className="text-2xl font-semibold tracking-tight">AFTraduction</h1>
        </div>
      </motion.div>
    </header>
  );
};
