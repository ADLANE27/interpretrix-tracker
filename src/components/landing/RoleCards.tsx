
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const RoleCards = () => {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Admin Card */}
        <motion.div
          whileHover={{ y: -5 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            to="/admin/login"
            className="block h-full p-6 bg-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300"
          >
            <div className="flex flex-col h-full">
              <div className="h-48 bg-gradient-to-r from-[#1a2844] to-[#2a3854] rounded-lg mb-4 overflow-hidden">
                {/* Admin dashboard preview mockup */}
                <div className="p-4 h-full flex flex-col gap-2">
                  <div className="bg-white/10 h-8 rounded w-3/4"></div>
                  <div className="flex gap-2 mt-2">
                    <div className="bg-white/10 h-20 w-1/3 rounded"></div>
                    <div className="bg-white/10 h-20 w-1/3 rounded"></div>
                    <div className="bg-white/10 h-20 w-1/3 rounded"></div>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-[#1a2844] mb-2">Espace Administrateur</h3>
              <p className="text-gray-600 text-sm">Gérez vos interprètes et missions en toute simplicité</p>
            </div>
          </Link>
        </motion.div>

        {/* Interpreter Card */}
        <motion.div
          whileHover={{ y: -5 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Link
            to="/interpreter/login"
            className="block h-full p-6 bg-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300"
          >
            <div className="flex flex-col h-full">
              <div className="h-48 bg-gradient-to-r from-[#f5a51d] to-[#f6b53d] rounded-lg mb-4 overflow-hidden">
                {/* Interpreter interface preview mockup */}
                <div className="p-4 h-full flex flex-col gap-2">
                  <div className="bg-white/10 h-8 rounded w-1/2"></div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-white/10 h-24 rounded"></div>
                    <div className="bg-white/10 h-24 rounded"></div>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-[#f5a51d] mb-2">Espace Interprète</h3>
              <p className="text-gray-600 text-sm">Gérez votre disponibilité et vos missions en temps réel</p>
            </div>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default RoleCards;
