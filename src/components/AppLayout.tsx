import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAuth } from '../contexts/AuthContext';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isViewingAsCustomer } = useAuth();

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={isViewingAsCustomer ? 'pt-10' : ''}>
          <Header onMenuClick={() => setSidebarOpen(true)} />
        </div>

        <main className="flex-1 overflow-y-auto w-full min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
