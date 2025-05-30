
import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import InterpreterLogin from './pages/InterpreterLogin';
import AdminLogin from './pages/AdminLogin';
import Admin from './pages/Admin';
import Index from './pages/Index';
import ResetPassword from './pages/ResetPassword';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { Footer } from './components/Footer';

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';
  const isLandingPage = location.pathname === '/';
  const isInterpreterRoute = location.pathname.startsWith('/interpreter');

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<Index />} />

          {/* Interpreter Routes */}
          <Route path="/interpreter/login" element={<InterpreterLogin />} />
          <Route path="/interpreter" element={<AuthenticatedLayout />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Admin />} />
          
          {/* Password Reset */}
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* 404 - Redirect to home */}
          <Route path="*" element={<Index />} />
        </Routes>
      </div>
      {!isAdminRoute && !isLandingPage && !isInterpreterRoute && <Footer />}
      <Toaster />
    </div>
  );
}

export default App;
