import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Truck, Users, Building2, FileText, X, UserCog, Settings, BookOpen, Search, LucideIcon, Bookmark, ChevronDown, Pin, HelpCircle, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getNotificationCounts } from '../services/learningNotificationService';
import { useSavedViews } from '../hooks/useSavedViews';
import { SavedView } from '../types/customerIntelligence';

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
  const { isAdmin, isViewingAsCustomer, viewingCustomer, isImpersonating, impersonatingCustomer } = useAuth();
  const { pinnedViews } = useSavedViews();
  const [learningQueueCount, setLearningQueueCount] = useState(0);
  const [savedViewsExpanded, setSavedViewsExpanded] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const navigateToView = (view: SavedView) => {
    onClose();
    if (view.viewType === 'shipments') {
      navigate('/shipments', { state: { savedView: view.viewConfig } });
    } else if (view.viewType === 'report') {
      navigate('/reports', { state: { savedView: view.viewConfig } });
    }
  };

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
      to: '/analyze',
      icon: Search,
      label: 'Analyze',
      matchPaths: ['/analyze', '/ai-studio', '/custom-reports', '/create']
    },
    {
      to: '/reports',
      icon: FileText,
      label: 'Reports',
      matchPaths: ['/reports', '/scheduled-reports', '/ai-reports']
    },
    { to: '/carriers', icon: Building2, label: 'Carriers' },
  ];

  const adminNavItems: NavItem[] = [
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/knowledge-base', icon: BookOpen, label: 'AI Knowledge', badge: learningQueueCount },
    { to: '/users', icon: UserCog, label: 'Users' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const shouldShowAdmin = isAdmin();

  const isActiveRoute = (item: NavItem) => {
    if (item.matchPaths) {
      return item.matchPaths.some(path => location.pathname.startsWith(path));
    }
    return location.pathname === item.to || location.pathname.startsWith(item.to + '/');
  };

  const navItemClasses = (isActive: boolean) => {
    if (isActive) {
      return 'flex items-center gap-3 px-4 py-2.5 rounded-xl text-white bg-white/10 border-l-[3px] border-rocket-500 shadow-sm';
    }
    return 'flex items-center gap-3 px-4 py-2.5 rounded-xl text-charcoal-300 hover:text-white hover:bg-white/10 transition-all duration-150';
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
        className={`fixed lg:sticky top-0 left-0 h-screen bg-gradient-to-b from-charcoal-800 to-charcoal-900 text-white w-64 flex flex-col z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-charcoal-700">
          <div className="flex items-center justify-between">
            <img
              src="/logo-with_words copy.png"
              alt="Rocket Shipping"
              className="h-10 w-auto"
            />
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isImpersonating && impersonatingCustomer && (
          <div className="mx-4 mt-4 px-4 py-3 bg-amber-500/20 border border-amber-500/40 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <UserCog className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">
                Impersonating
              </span>
            </div>
            <div className="text-sm font-medium text-white">
              {impersonatingCustomer.company_name}
            </div>
          </div>
        )}

        {isViewingAsCustomer && viewingCustomer && !isImpersonating && (
          <div className="mx-4 mt-4 px-4 py-3 bg-blue-500/20 border border-blue-500/40 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-blue-300 uppercase tracking-wide">
                Viewing
              </span>
            </div>
            <div className="text-sm font-medium text-white">
              {viewingCustomer.company_name}
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={() => navItemClasses(isActiveRoute(item))}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 bg-rocket-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}

          {pinnedViews.length > 0 && (
            <div className="pt-4 mt-2 border-t border-charcoal-700">
              <button
                onClick={() => setSavedViewsExpanded(!savedViewsExpanded)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-charcoal-400 hover:text-white transition-colors rounded-xl"
              >
                <span className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4" />
                  Saved Views
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${savedViewsExpanded ? '' : '-rotate-90'}`}
                />
              </button>

              {savedViewsExpanded && (
                <div className="mt-1 space-y-1">
                  {pinnedViews.map(view => (
                    <button
                      key={view.id}
                      onClick={() => navigateToView(view)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-charcoal-300 hover:bg-white/10 hover:text-white rounded-xl transition-colors text-left"
                    >
                      <Pin className="w-3 h-3 text-rocket-400 flex-shrink-0" />
                      <span className="truncate">{view.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {shouldShowAdmin && (
            <>
              <div className="pt-6 pb-2">
                <div className="flex items-center gap-2 px-2">
                  <div className="flex-1 h-px bg-charcoal-700"></div>
                  <span className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">
                    Admin
                  </span>
                  <div className="flex-1 h-px bg-charcoal-700"></div>
                </div>
              </div>

              {adminNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={() => navItemClasses(isActiveRoute(item))}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 bg-rocket-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-charcoal-700">
          <NavLink
            to="/settings/how-to"
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 text-charcoal-300 hover:bg-white/10 hover:text-white rounded-xl transition-colors mb-3"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Help & Docs</span>
          </NavLink>
          <div className="text-xs text-charcoal-500 text-center">
            Version 1.0.0
          </div>
        </div>
      </aside>
    </>
  );
}
