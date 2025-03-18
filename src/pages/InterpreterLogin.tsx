
import { InterpreterLoginForm } from "@/components/auth/InterpreterLoginForm";

const InterpreterLogin = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F8F9FA] to-[#E9ECEF] p-4 sm:p-6 safe-area-top safe-area-bottom">
      <div className="absolute inset-0 bg-grid-black/[0.02] -z-10" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white/20 to-purple-50/50 -z-10" />
      <InterpreterLoginForm />
    </div>
  );
};

export default InterpreterLogin;
