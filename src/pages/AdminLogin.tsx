
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";

const AdminLogin = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDB813] relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-yellow-300/10 to-yellow-400/20" />
      
      {/* Content */}
      <AdminLoginForm />
    </div>
  );
};

export default AdminLogin;

