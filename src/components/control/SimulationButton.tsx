import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SimulationButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  title?: string;
}

export function SimulationButton({ 
  onClick, 
  icon: Icon, 
  label, 
  variant = 'primary',
  disabled = false,
  title,
}: SimulationButtonProps) {
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400',
    secondary: 'bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400',
    danger: 'bg-red-600 hover:bg-red-700 disabled:bg-red-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center px-4 py-2 text-white rounded-md ${variants[variant]} disabled:cursor-not-allowed transition-colors`}
    >
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </button>
  );
}