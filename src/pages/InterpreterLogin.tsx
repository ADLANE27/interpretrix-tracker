
import { InterpreterLoginForm } from "@/components/auth/InterpreterLoginForm";
import { motion } from "framer-motion";

const InterpreterLogin = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#fdfcfb] to-[#e2d1c3] p-4">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-blue-50/20 to-white/10 backdrop-blur-[2px] -z-10" />
      
      {/* Logo */}
      <motion.img 
        src="/lovable-uploads/3737b103-faab-4bfc-a201-b1728b56f682.png" 
        alt="Interpretix Logo" 
        className="w-[300px] md:w-[400px] max-w-[90vw] mb-12 drop-shadow-lg"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Wrapper for the login form with enhanced glass effect */}
      <div className="w-full max-w-md relative">
        <div className="absolute inset-0 bg-white/40 backdrop-blur-xl rounded-2xl" />
        <div className="relative bg-gradient-to-br from-white/80 to-white/50 rounded-2xl border border-white/20 shadow-xl">
          <InterpreterLoginForm />
        </div>
      </div>
    </div>
  );
};

export default InterpreterLogin;
