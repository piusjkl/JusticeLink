import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { DemoNotice } from './DemoNotice';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 pt-20 ml-64">
          <div className="max-w-7xl mx-auto space-y-4">
            <DemoNotice compact />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
