
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { NotificationProvider } from '@/contexts/NotificationContext';
import InterpreterLogin from './pages/InterpreterLogin';
import AdminLogin from './pages/AdminLogin';
import Admin from './pages/Admin';
import Index from './pages/Index';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { MissionsTab } from '@/components/interpreter/MissionsTab';
import { ProfileTab } from '@/components/interpreter/ProfileTab';

function App() {
  return (
    <NotificationProvider>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<Index />} />

        {/* Interpreter Routes */}
        <Route path="/interpreter/login" element={<InterpreterLogin />} />
        <Route path="/interpreter" element={<AuthenticatedLayout />}>
          <Route index element={<MissionsTab />} />
          <Route path="missions" element={<MissionsTab />} />
          <Route path="profile" element={<ProfileTab />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<Admin />} />

        {/* 404 - Redirect to home */}
        <Route path="*" element={<Index />} />
      </Routes>
      <Toaster />
    </NotificationProvider>
  );
}

export default App;
