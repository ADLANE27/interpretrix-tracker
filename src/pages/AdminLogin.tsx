import { AdminLoginForm } from "@/components/auth/AdminLoginForm";

const AdminLogin = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F8F9FA] to-[#E9ECEF] p-4">
      <div className="absolute inset-0 bg-grid-black/[0.02] -z-10" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white/20 to-purple-50/50 -z-10" />
      <AdminLoginForm />
    </div>
  );
};

export default AdminLogin;