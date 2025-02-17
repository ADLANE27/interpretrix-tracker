
import { Routes, Route } from 'react-router-dom';
import { InterpreterLogin } from '@/pages/InterpreterLogin';

export const SiteRoutes = () => {
  return (
    <Routes>
      <Route path="/interpreter/login" element={<InterpreterLogin />} />
    </Routes>
  );
};
