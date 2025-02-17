import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { NotificationProvider } from '@/contexts/NotificationContext';
import InterpreterLogin from './pages/InterpreterLogin';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { MissionsTab } from '@/components/interpreter/MissionsTab';
import { ProfileTab } from '@/components/interpreter/ProfileTab';

function App() {
  return (
    <NotificationProvider>
      <Routes>
        <Route path="/interpreter/login" element={<InterpreterLogin />} />
        <Route path="/interpreter" element={<AuthenticatedLayout />}>
          <Route index element={<MissionsTab />} />
          <Route path="missions" element={<MissionsTab />} />
          <Route path="profile" element={<ProfileTab />} />
        </Route>
      </Routes>
      <Toaster />
    </NotificationProvider>
  );
}

export default App;
