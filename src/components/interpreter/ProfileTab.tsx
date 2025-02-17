
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { NotificationManager } from '@/components/notifications/NotificationManager';

export const ProfileTab = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Paramètres de notification</h2>
              <NotificationManager />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
