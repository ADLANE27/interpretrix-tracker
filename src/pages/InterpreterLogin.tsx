
import { InterpreterLoginForm } from "@/components/auth/InterpreterLoginForm";
import { motion } from "framer-motion";

const InterpreterLogin = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white via-[#F8F9FA] to-[#F1F1F1] p-4">
      {/* Background gradient overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-tr from-white/80 via-[#fff6] to-white/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      />
      
      {/* Logo with enhanced animation */}
      <motion.img 
        src="/lovable-uploads/3737b103-faab-4bfc-a201-b1728b56f682.png" 
        alt="Interpretix Logo" 
        className="w-[300px] md:w-[400px] max-w-[90vw] mb-12 relative z-10"
        initial={{ scale: 0.9, opacity: 0, y: -20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />

      {/* Login form with fade-in animation */}
      <motion.div 
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3 }}
      >
        <InterpreterLoginForm />
      </motion.div>
    </div>
  );
};

export default InterpreterLogin;
