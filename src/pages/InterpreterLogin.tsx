
import { InterpreterLoginForm } from "@/components/auth/InterpreterLoginForm";
import { motion } from "framer-motion";

const InterpreterLogin = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-palette-soft-blue p-3 sm:p-4 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-grid-black/[0.02] -z-10" />
      <div className="absolute inset-0 bg-gradient-to-br from-palette-soft-purple/30 via-white/20 to-palette-soft-blue/30 -z-10" />
      
      {/* Decorative circles */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-palette-ocean-blue/10 rounded-full blur-3xl -z-5" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-palette-vivid-purple/10 rounded-full blur-3xl -z-5" />
      
      {/* Main content with animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <InterpreterLoginForm />
      </motion.div>
    </div>
  );
};

export default InterpreterLogin;
