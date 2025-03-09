
import { InterpreterLoginForm } from "@/components/auth/InterpreterLoginForm";
import { motion } from "framer-motion";

const InterpreterLogin = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#F8F9FA] to-[#E9ECEF] p-4">
      <div className="absolute inset-0 bg-grid-black/[0.02] -z-10" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white/20 to-purple-50/50 -z-10" />
      <motion.img 
        src="/lovable-uploads/3737b103-faab-4bfc-a201-b1728b56f682.png" 
        alt="Interpretix Logo" 
        className="w-[300px] md:w-[400px] max-w-[90vw] mb-8"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
      <InterpreterLoginForm />
    </div>
  );
};

export default InterpreterLogin;
