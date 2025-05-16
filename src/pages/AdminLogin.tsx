
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { motion } from "framer-motion";
import { Shield, ShieldCheck } from "lucide-react";

const AdminLogin = () => {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: "url('/lovable-uploads/c8a9b911-37a5-4f23-b3d2-c47b7436e522.png')",
        }}
      />
      
      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/40 to-black/60" />
      
      {/* Subtle animated pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.03] opacity-50" />
      
      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              top: `${10 + i * 15}%`,
              right: `${5 + i * 12}%`,
              opacity: 0.4
            }}
            animate={{
              y: [0, i % 2 === 0 ? -10 : 10, 0],
              rotate: [0, i % 2 === 0 ? 5 : -5, 0]
            }}
            transition={{
              repeat: Infinity,
              duration: 4 + i,
              ease: "easeInOut",
              delay: i * 0.3
            }}
          >
            {i % 2 === 0 ? (
              <Shield size={i % 3 === 0 ? 24 : 32} className="text-yellow-400/60" />
            ) : (
              <ShieldCheck size={i % 3 === 0 ? 28 : 36} className="text-yellow-500/50" />
            )}
          </motion.div>
        ))}
      </div>
      
      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <AdminLoginForm />
      </motion.div>
    </div>
  );
};

export default AdminLogin;
