import React from 'react';

export function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 shadow-md mt-auto border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          © 2025{' '}
          <span className="font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            DEFENsys
          </span>
          . All rights reserved.
        </p>
      </div>
    </footer>
  );
}