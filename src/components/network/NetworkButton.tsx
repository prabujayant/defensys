import React from 'react';
import { LucideIcon } from 'lucide-react';

interface NetworkButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}

export function NetworkButton({ onClick, icon: Icon, label }: NetworkButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      title={label}
    >
      <Icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
    </button>
  );
}