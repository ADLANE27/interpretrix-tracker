
import { InterpreterLoginForm } from "@/components/auth/InterpreterLoginForm";
import { motion } from "framer-motion";

const InterpreterLogin = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
      {/* Logo */}
      <motion.img 
        src="/lovable-uploads/3737b103-faab-4bfc-a201-b1728b56f682.png" 
        alt="Interpretix Logo" 
        className="w-[300px] md:w-[400px] max-w-[90vw] mb-12"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Login form without the box effect */}
      <div className="w-full max-w-md">
        <InterpreterLoginForm />
      </div>
    </div>
  );
};

export default InterpreterLogin;
