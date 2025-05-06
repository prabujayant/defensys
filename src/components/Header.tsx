import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo & Title */}
        <Link
          to="/"
          className="flex items-center gap-3 group"
          aria-label="Go to homepage"
        >
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white transform transition-transform group-hover:scale-110">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent tracking-tight">
              DEFENsys
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              Autonomous AI Threat Defense
            </p>
          </div>
        </Link>

        {/* Right Side Controls */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}