import { useEffect } from 'react';
import { generateAndStoreVapidKeys } from '@/lib/generateVapidKeys';

const Admin = () => {
  useEffect(() => {
    const setupVapidKeys = async () => {
      try {
        const keys = await generateAndStoreVapidKeys();
        console.log('VAPID keys generated successfully:', keys);
      } catch (error) {
        console.error('Failed to generate VAPID keys:', error);
      }
    };

    setupVapidKeys();
  }, []);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome to the admin dashboard. Here you can manage your application settings.</p>
      <button onClick={setupVapidKeys}>Generate VAPID Keys</button>
    </div>
  );
};

export default Admin;
