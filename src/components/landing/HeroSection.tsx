
import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Languages, Users } from 'lucide-react';

const HeroSection = () => {
  return (
    <div className="relative min-h-[80vh] flex items-center">
      <div className="absolute inset-0 bg-gradient-to-r from-[#1a2844] to-[#2a3854] opacity-95" />
      
      <div className="container mx-auto px-4 z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-white"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-[#f5a51d]">Interpretix</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200">
              Disponibilité en temps réel et gestion de missions
            </p>
            <div className="flex gap-6 mb-8">
              <Feature icon={Globe} text="Couverture Mondiale" />
              <Feature icon={Languages} text="Multi-langues" />
              <Feature icon={Users} text="Experts Qualifiés" />
            </div>
          </motion.div>

          {/* Right content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative">
              <div className="absolute -top-20 -right-20 w-72 h-72 bg-[#f5a51d] rounded-full opacity-20 blur-3xl" />
              <img
                src="/interpreter-hero.jpg"
                alt="Professional Interpreter"
                className="rounded-lg shadow-2xl relative z-10"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const Feature = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className="flex flex-col items-center gap-2"
  >
    <div className="p-3 bg-white/10 rounded-full">
      <Icon className="w-6 h-6 text-[#f5a51d]" />
    </div>
    <span className="text-sm font-medium">{text}</span>
  </motion.div>
);

export default HeroSection;
