import { InterpreterLoginForm } from "@/components/auth/InterpreterLoginForm";

const InterpreterLogin = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F1F0FB] to-[#E5DEFF] p-4">
      <div className="absolute inset-0 bg-grid-black/[0.02] -z-10" />
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-white/20 to-blue-50/50 -z-10" />
      <InterpreterLoginForm />
    </div>
  );
};

export default InterpreterLogin;