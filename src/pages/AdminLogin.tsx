
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { motion } from "framer-motion";

const AdminLogin = () => {
  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* Background elements */}
      <div className="absolute inset-0 bg-grid-black/[0.02] -z-10" />
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-white/20 to-orange-50/30 -z-10" />
      
      {/* Decorative circles */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl -z-5" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -z-5" />
      
      {/* Background Image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: "url('/lovable-uploads/c8a9b911-37a5-4f23-b3d2-c47b7436e522.png')",
        }}
      />
      
      {/* Overlay with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-yellow-50/80 backdrop-blur-[1px]"></div>
      
      {/* Main content with animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <AdminLoginForm />
      </motion.div>
    </div>
  );
};

export default AdminLogin;
