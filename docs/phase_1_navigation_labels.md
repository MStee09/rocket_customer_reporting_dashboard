# Phase 1: Navigation & Label Updates

## Overview
This phase updates navigation labels and restructures the sidebar. These are simple text and routing changes with no architectural impact.

## Changes Summary
1. Rename "Create" → "Analyze" in sidebar
2. Update route from `/ai-studio` to `/analyze`
3. Update admin section labels
4. Clean up logo redundancy in sidebar

---

## File 1: `src/components/Sidebar.tsx`

**Replace the entire file with:**

```tsx
import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Building2, 
  FileText, 
  X, 
  UserCog, 
  Database, 
  Settings, 
  BookOpen, 
  Search, 
  LucideIcon, 
  Bookmark, 
  ChevronDown, 
  Pin, 
  HelpCircle 
} from 'lucide-react';
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
  const { isAdmin, isViewingAsCustomer, viewingCustomer } = useAuth();
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
    { to: '/knowledge-base', icon: BookOpen, label: 'AI Training Data', badge: learningQueueCount },
    { to: '/users', icon: UserCog, label: 'User Management' },
    { to: '/schema', icon: Database, label: 'Data Fields' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const shouldShowAdmin = isAdmin() && !isViewingAsCustomer;

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
        {/* Simplified header - just logo */}
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

        {isViewingAsCustomer && viewingCustomer && (
          <div className="mx-4 mt-4 px-4 py-3 bg-coral-500/20 border border-coral-500/40 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-coral-400" />
              <span className="text-xs font-semibold text-coral-300 uppercase tracking-wide">
                Viewing As
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
```

---

## File 2: `src/App.tsx`

**Replace the entire file with:**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ShipmentsPage } from './pages/ShipmentsPage';
import { ShipmentDetailPage } from './pages/ShipmentDetailPage';
import { CustomersPage } from './pages/CustomersPage';
import { CarriersPage } from './pages/CarriersPage';
import { AnalyzePage } from './pages/AnalyzePage';
import { ReportsHubPage } from './pages/ReportsHubPage';
import { AvgCostPerUnitPage } from './pages/AvgCostPerUnitPage';
import { CustomReportsPage } from './pages/CustomReportsPage';
import { CustomReportViewPage } from './pages/CustomReportViewPage';
import { WidgetLibraryPage } from './pages/WidgetLibraryPage';
import { AIReportViewerPage } from './pages/AIReportViewerPage';
import { SharedReportPage } from './pages/SharedReportPage';
import { ScheduledReportsPage } from './pages/ScheduledReportsPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { SchemaExplorerPage } from './pages/SchemaExplorerPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { CustomerProfileEditorPage } from './pages/CustomerProfileEditorPage';
import { CustomerProfileHistoryPage } from './pages/CustomerProfileHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { HowToPage } from './pages/HowToPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { DebugPage } from './pages/DebugPage';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MetricProtectedRoute } from './components/MetricProtectedRoute';
import { ToastProvider } from './components/ui/Toast';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
    },
  },
});

function LoginRedirect() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-rocket-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginPage />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginRedirect />} />
            <Route path="/shared/reports/:token" element={<SharedReportPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="shipments" element={<ShipmentsPage />} />
              <Route path="shipments/:loadId" element={<ShipmentDetailPage />} />
              <Route
                path="customers"
                element={
                  <ProtectedRoute requireAdmin>
                    <CustomersPage />
                  </ProtectedRoute>
                }
              />
              <Route path="carriers" element={<CarriersPage />} />
              
              {/* New unified Analyze route */}
              <Route path="analyze" element={<AnalyzePage />} />
              
              {/* Legacy redirects - keep these for bookmarks/links */}
              <Route path="ai-studio" element={<Navigate to="/analyze?mode=ai" replace />} />
              <Route path="create" element={<Navigate to="/analyze" replace />} />
              <Route path="analytics" element={<Navigate to="/analyze" replace />} />
              
              <Route path="reports" element={<ReportsHubPage />} />
              <Route
                path="reports/avg-cost-per-unit"
                element={
                  <MetricProtectedRoute metricKey="avg-cost-per-unit">
                    <AvgCostPerUnitPage />
                  </MetricProtectedRoute>
                }
              />
              <Route path="custom-reports" element={<CustomReportsPage />} />
              <Route path="custom-reports/:reportId" element={<CustomReportViewPage />} />
              <Route path="ai-reports/:reportId" element={<AIReportViewerPage />} />
              <Route path="scheduled-reports" element={<ScheduledReportsPage />} />
              <Route path="widget-library" element={<WidgetLibraryPage />} />
              <Route
                path="users"
                element={
                  <ProtectedRoute requireAdmin>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="schema"
                element={
                  <ProtectedRoute requireAdmin>
                    <SchemaExplorerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="knowledge-base"
                element={
                  <ProtectedRoute requireAdmin>
                    <KnowledgeBasePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/customer-profiles/:customerId/edit"
                element={
                  <ProtectedRoute requireAdmin>
                    <CustomerProfileEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/customer-profiles/:customerId/history"
                element={
                  <ProtectedRoute requireAdmin>
                    <CustomerProfileHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="ai-learning"
                element={<Navigate to="/knowledge-base?tab=learning" replace />}
              />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/how-to" element={<HowToPage />} />
              <Route path="debug" element={<DebugPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

---

## File 3: `src/pages/AnalyzePage.tsx` (NEW FILE)

**Create this new file:**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Sparkles, Table2, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { loadAIReports, SavedAIReport } from '../services/aiReportService';
import { useCustomerReports } from '../hooks/useCustomerReports';
import { AIReportStudioPage } from './AIReportStudioPage';
import { formatDistanceToNow } from 'date-fns';

type AnalyzeMode = 'select' | 'ai' | 'builder';

export function AnalyzePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, effectiveCustomerId } = useAuth();
  const { reports: customReports } = useCustomerReports();
  
  const initialMode = searchParams.get('mode') as AnalyzeMode || 'select';
  const [mode, setMode] = useState<AnalyzeMode>(initialMode);
  const [recentReports, setRecentReports] = useState<Array<{ id: string; name: string; type: 'ai' | 'custom'; date: string }>>([]);

  useEffect(() => {
    loadRecentReports();
  }, [user, effectiveCustomerId, customReports]);

  async function loadRecentReports() {
    if (!user || !effectiveCustomerId) return;

    try {
      const aiReports = await loadAIReports(effectiveCustomerId.toString());
      
      const combined = [
        ...aiReports.slice(0, 3).map(r => ({
          id: r.id,
          name: r.name,
          type: 'ai' as const,
          date: r.createdAt,
        })),
        ...customReports.slice(0, 3).map(r => ({
          id: r.id,
          name: r.name,
          type: 'custom' as const,
          date: r.updatedAt || r.createdAt,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      setRecentReports(combined);
    } catch (error) {
      console.error('Failed to load recent reports:', error);
    }
  }

  // If mode is 'ai', render the full AI Studio
  if (mode === 'ai') {
    return <AIReportStudioPage />;
  }

  // If mode is 'builder', navigate to custom reports
  if (mode === 'builder') {
    navigate('/custom-reports');
    return null;
  }

  // Default: show the selection screen
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            What do you want to know?
          </h1>
          <p className="text-slate-600 text-lg">
            Choose how you'd like to analyze your freight data
          </p>
        </div>

        {/* Two Options */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Ask AI Option */}
          <button
            onClick={() => setMode('ai')}
            className="group p-8 bg-white rounded-2xl border-2 border-slate-200 hover:border-rocket-500 hover:shadow-lg transition-all text-left"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Ask AI
            </h2>
            <p className="text-slate-600 mb-4">
              Describe what you want in plain language. Best for quick exploration and complex questions.
            </p>
            <div className="flex items-center text-rocket-600 font-medium">
              Get started
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Build Report Option */}
          <button
            onClick={() => setMode('builder')}
            className="group p-8 bg-white rounded-2xl border-2 border-slate-200 hover:border-rocket-500 hover:shadow-lg transition-all text-left"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Table2 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Build Report
            </h2>
            <p className="text-slate-600 mb-4">
              Select columns, filters, and groupings manually. Best for precise specifications.
            </p>
            <div className="flex items-center text-rocket-600 font-medium">
              Open builder
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        {/* Recent Reports */}
        {recentReports.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                Recent Reports
              </h3>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {recentReports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => navigate(
                    report.type === 'ai' 
                      ? `/ai-reports/${report.id}` 
                      : `/custom-reports/${report.id}`
                  )}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    report.type === 'ai' 
                      ? 'bg-amber-100 text-amber-600' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {report.type === 'ai' ? (
                      <Sparkles className="w-4 h-4" />
                    ) : (
                      <Table2 className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {report.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDistanceToNow(new Date(report.date), { addSuffix: true })}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="mt-12 p-6 bg-slate-100 rounded-xl">
          <h4 className="font-medium text-slate-900 mb-3">Quick tips</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-rocket-500 mt-0.5">•</span>
              <span><strong>Ask AI</strong> works best for questions like "Show me cost trends by carrier" or "Which lanes have the highest spend?"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rocket-500 mt-0.5">•</span>
              <span><strong>Build Report</strong> is better when you know exactly which columns and filters you need</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rocket-500 mt-0.5">•</span>
              <span>Any report can be saved, scheduled, or added to your dashboard</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AnalyzePage;
```

---

## Testing Checklist

After applying these changes:

1. [ ] Sidebar shows "Analyze" instead of "Create"
2. [ ] Sidebar shows "AI Training Data" instead of "Knowledge Base"
3. [ ] Sidebar shows "Data Fields" instead of "Schema Explorer"
4. [ ] Clicking "Analyze" shows the new selection page
5. [ ] "Ask AI" button opens the AI Studio
6. [ ] "Build Report" button navigates to custom reports
7. [ ] Recent reports display correctly
8. [ ] Old `/ai-studio` URL redirects to `/analyze?mode=ai`
9. [ ] Old `/create` URL redirects to `/analyze`
10. [ ] Sidebar logo no longer has redundant text next to it

---

## Notes

- The `AIReportStudioPage` component is reused directly when AI mode is selected
- Legacy routes are preserved as redirects so existing bookmarks still work
- The selection screen provides clear differentiation between the two paths
- Recent reports help users quickly return to their work
