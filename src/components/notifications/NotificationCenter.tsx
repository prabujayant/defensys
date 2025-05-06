import React from 'react';
import { Bell } from 'lucide-react';
import { Notification } from '../../types/notification';

interface NotificationCenterProps {
  notifications: Notification[];
}

export function NotificationCenter({ notifications }: NotificationCenterProps) {
  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`mb-2 p-4 rounded-lg shadow-lg transform transition-all duration-300 
            ${notification.type === 'error' ? 'bg-red-500' : 'bg-indigo-500'} 
            text-white`}
        >
          <div className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            <div>
              <h4 className="font-semibold">{notification.title}</h4>
              <p className="text-sm opacity-90">{notification.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}