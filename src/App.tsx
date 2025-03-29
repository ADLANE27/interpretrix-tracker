
import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import InterpreterLogin from './pages/InterpreterLogin';
import AdminLogin from './pages/AdminLogin';
import Admin from './pages/Admin';
import Index from './pages/Index';
import ResetPassword from './pages/ResetPassword';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { Footer } from './components/Footer';
import { useIsIOS } from '@/hooks/use-mobile';

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';
  const isIOS = useIsIOS();
  
  useEffect(() => {
    // Set up mobile-specific view setup
    const setViewportHeight = () => {
      // Set custom viewport height variable for mobile browsers
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    // Run once on mount
    setViewportHeight();
    
    // Set up event listeners for viewport changes
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', () => {
      setTimeout(setViewportHeight, 100);
    });
    
    // Prevent pull-to-refresh on mobile
    document.body.style.overscrollBehavior = 'none';
    
    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  return (
    <div className={`flex flex-col min-h-screen ${isIOS ? 'ios-device' : ''}`}>
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
      {!isAdminRoute && <Footer />}
      <Toaster />
    </div>
  );
}

export default App;
