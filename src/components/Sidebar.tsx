import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Truck, Users, Building2, FileText, Rocket, X, UserCog, Database, Settings, BookOpen, BarChart3, LucideIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getNotificationCounts } from '../services/learningNotificationService';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  matchPaths?: string[];
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { isAdmin, isViewingAsCustomer, viewingCustomer } = useAuth();
  const [learningQueueCount, setLearningQueueCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    async function loadPendingCount() {
      const counts = await getNotificationCounts();
      setLearningQueueCount(counts.pending);
    }
    loadPendingCount();
    const interval = setInterval(loadPendingCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const mainNavItems: NavItem[] = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/shipments', icon: Truck, label: 'Shipments' },
    {
      to: '/analytics',
      icon: BarChart3,
      label: 'Analytics',
      matchPaths: ['/analytics', '/ai-studio', '/custom-reports', '/widget-library']
    },
    {
      to: '/reports',
      icon: FileText,
      label: 'Reports',
      matchPaths: ['/reports', '/scheduled-reports']
    },
    { to: '/carriers', icon: Building2, label: 'Carriers' },
  ];

  const adminNavItems: NavItem[] = [
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/knowledge-base', icon: BookOpen, label: 'Knowledge Base', badge: learningQueueCount },
    { to: '/users', icon: UserCog, label: 'User Management' },
    { to: '/schema', icon: Database, label: 'Schema Explorer' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const shouldShowAdmin = isAdmin() && !isViewingAsCustomer;

  const isActiveRoute = (item: NavItem) => {
    if (item.matchPaths) {
      return item.matchPaths.some(path => location.pathname.startsWith(path));
    }
    return location.pathname === item.to || location.pathname.startsWith(item.to + '/');
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen bg-rocket-navy text-white w-64 flex flex-col z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-rocket-navy-dark">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rocket-orange rounded-lg flex items-center justify-center">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Rocket Shipping</h1>
                <p className="text-xs text-slate-300">Freight Reporting</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-rocket-navy-light rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isViewingAsCustomer && viewingCustomer && (
          <div className="mx-4 mt-4 px-4 py-3 bg-orange-500/20 border border-orange-500/40 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-semibold text-orange-300 uppercase tracking-wide">
                Viewing As
              </span>
            </div>
            <div className="text-sm font-medium text-white">
              {viewingCustomer.company_name}
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={() =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActiveRoute(item)
                    ? 'bg-rocket-orange text-white'
                    : 'text-slate-200 hover:bg-rocket-navy-light hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}

          {shouldShowAdmin && (
            <>
              <div className="pt-6 pb-2">
                <div className="flex items-center gap-2 px-2">
                  <div className="flex-1 h-px bg-slate-600"></div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Admin
                  </span>
                  <div className="flex-1 h-px bg-slate-600"></div>
                </div>
              </div>

              {adminNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={() =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActiveRoute(item)
                        ? 'bg-rocket-orange text-white'
                        : 'text-slate-200 hover:bg-rocket-navy-light hover:text-white'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-rocket-navy-dark">
          <div className="text-xs text-slate-300 text-center">
            Version 1.0.0
          </div>
        </div>
      </aside>
    </>
  );
}
