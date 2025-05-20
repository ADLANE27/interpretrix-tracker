
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";

const AdminLogin = () => {
  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: "url('/lovable-uploads/c8a9b911-37a5-4f23-b3d2-c47b7436e522.png')",
        }}
      />
      
      {/* Content */}
      <AdminLoginForm />
    </div>
  );
};

export default AdminLogin;

