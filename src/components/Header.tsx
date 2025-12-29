import { LogOut, User, Menu, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CustomerSwitcher } from './CustomerSwitcher';
import { AdminCustomerSelector } from './AdminCustomerSelector';
import { NotificationBell } from './notifications/NotificationBell';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, role, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="container mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-slate-600" />
          </button>

          <div className="hidden lg:block">
            <h2 className="text-xl font-semibold text-slate-800">Freight Reporting Dashboard</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-800">{user?.email}</p>
                <div className="flex items-center justify-end gap-2">
                  {role && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        role.is_admin
                          ? 'bg-charcoal-800 text-white'
                          : 'bg-rocket-green text-white'
                      }`}
                    >
                      {role.user_role}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-10 h-10 bg-charcoal-800/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-rocket-navy" />
              </div>
            </div>

            {isAdmin() ? <AdminCustomerSelector /> : <CustomerSwitcher />}

            <NotificationBell />

            <button
              onClick={() => navigate('/settings/how-to')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Help & Documentation"
            >
              <HelpCircle className="w-5 h-5 text-slate-600" />
            </button>

            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 bg-charcoal-800 hover:bg-charcoal-800-light text-white rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
  );
}
