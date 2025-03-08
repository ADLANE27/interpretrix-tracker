
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";

const AdminLogin = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ 
          backgroundImage: "url('/lovable-uploads/fa9b5d25-cbd8-4204-8420-b0cf908e2e21.png')",
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white/20 to-purple-50/50" />
      
      {/* Content */}
      <AdminLoginForm />
    </div>
  );
};

export default AdminLogin;
