
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";

const AdminLogin = () => {
  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("/lovable-uploads/68d3bed9-9180-4b41-9204-59976a6ceda8.png")',
          imageRendering: 'crisp-edges',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/40" /> {/* Dark overlay for better contrast */}
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4">
        <AdminLoginForm />
      </div>
    </div>
  );
};

export default AdminLogin;
