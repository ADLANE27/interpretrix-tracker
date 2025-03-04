
import { motion } from "framer-motion";
import { Users, Globe } from "lucide-react";
import { Link } from "react-router-dom";

export const RoleCards = () => {
  return (
    <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="group"
      >
        <Link 
          to="/admin/login"
          className="block h-full p-8 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-white/20 transition-all duration-200"
        >
          <Users className="h-12 w-12 mb-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
          <h2 className="text-2xl font-semibold mb-2 text-white">Espace Administrateur</h2>
          <p className="text-gray-300">
            Gérez les interprètes et les missions de traduction
          </p>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="group"
      >
        <Link 
          to="/interpreter/login"
          className="block h-full p-8 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-white/20 transition-all duration-200"
        >
          <Globe className="h-12 w-12 mb-4 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
          <h2 className="text-2xl font-semibold mb-2 text-white">Espace Interprète</h2>
          <p className="text-gray-300">
            Accédez à vos missions et gérez votre disponibilité
          </p>
        </Link>
      </motion.div>
    </div>
  );
};
