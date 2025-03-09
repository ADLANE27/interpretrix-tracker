
import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';

export const LoginOptions = () => {
  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative group"
      >
        <div className="p-6 rounded-lg bg-gradient-to-br from-[#1a2844]/90 to-[#2a3854]/90 backdrop-blur-sm border border-white/10 shadow-lg transition-all duration-300 group-hover:shadow-xl">
          <div className="flex flex-col items-center gap-4 text-white">
            <Users className="w-12 h-12" />
            <h2 className="text-xl font-semibold">Espace Administrateur</h2>
            <p className="text-sm text-center text-white/80 mb-4">
              Gestion des projets et des interprètes
            </p>
            <Button asChild className="w-full bg-white/10 hover:bg-white/20 transition-colors">
              <Link to="/admin/login">Accéder</Link>
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="relative group"
      >
        <div className="p-6 rounded-lg bg-gradient-to-br from-[#f5a51d]/90 to-[#f6b53d]/90 backdrop-blur-sm border border-white/10 shadow-lg transition-all duration-300 group-hover:shadow-xl">
          <div className="flex flex-col items-center gap-4 text-white">
            <Globe className="w-12 h-12" />
            <h2 className="text-xl font-semibold">Espace Interprète</h2>
            <p className="text-sm text-center text-white/80 mb-4">
              Gestion des missions et du planning
            </p>
            <Button asChild className="w-full bg-white/10 hover:bg-white/20 transition-colors">
              <Link to="/interpreter/login">Accéder</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
