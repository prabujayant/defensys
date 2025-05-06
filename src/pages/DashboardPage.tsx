import React from 'react';
import { Dashboard } from '../components/Dashboard';
import { Footer } from '../components/Footer';

export function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Dashboard />
      <Footer />
    </div>
  );
}