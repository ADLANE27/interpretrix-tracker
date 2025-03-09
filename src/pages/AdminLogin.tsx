
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { motion } from "framer-motion";

const AdminLogin = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: "url('/lovable-uploads/c8a9b911-37a5-4f23-b3d2-c47b7436e522.png')",
        }}
      />
      
      {/* Logo */}
      <motion.img 
        src="/lovable-uploads/3737b103-faab-4bfc-a201-b1728b56f682.png" 
        alt="Interpretix Logo" 
        className="w-[300px] md:w-[400px] max-w-[90vw] mb-8 relative z-10"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Content */}
      <AdminLoginForm />
    </div>
  );
};

export default AdminLogin;
