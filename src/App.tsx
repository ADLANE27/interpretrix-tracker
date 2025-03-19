
import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import InterpreterLogin from './pages/InterpreterLogin';
import AdminLogin from './pages/AdminLogin';
import Admin from './pages/Admin';
import Index from './pages/Index';
import ResetPassword from './pages/ResetPassword';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { initializeNotificationSound } from '@/utils/notificationSound';

function App() {
  // Initialize notification sound when the app loads
  useEffect(() => {
    initializeNotificationSound();
  }, []);

  return (
    <>
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
      <Toaster />
    </>
  );
}

export default App;
