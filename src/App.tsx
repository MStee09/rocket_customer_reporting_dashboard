import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { initializeWidgets } from './widgets/init';
import { LoginPage } from './pages/LoginPage';
import { PulseDashboardPage } from './pages/PulseDashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MetricProtectedRoute } from './components/MetricProtectedRoute';
import { ToastProvider } from './components/ui/Toast';
import { ImpersonationGuardProvider } from './components/ui/ImpersonationGuard';
import { Loader2 } from 'lucide-react';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AnalyticsHubPage = lazy(() => import('./pages/AnalyticsHubPage').then(m => ({ default: m.AnalyticsHubPage })));
const ShipmentsPage = lazy(() => import('./pages/ShipmentsPage').then(m => ({ default: m.ShipmentsPage })));
const ShipmentDetailPage = lazy(() => import('./pages/ShipmentDetailPage').then(m => ({ default: m.ShipmentDetailPage })));
const CustomersPage = lazy(() => import('./pages/CustomersPage').then(m => ({ default: m.CustomersPage })));
const AIReportStudioPage = lazy(() => import('./pages/AIReportStudioPage').then(m => ({ default: m.AIReportStudioPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const AvgCostPerUnitPage = lazy(() => import('./pages/AvgCostPerUnitPage').then(m => ({ default: m.AvgCostPerUnitPage })));
const CustomReportViewPage = lazy(() => import('./pages/CustomReportViewPage').then(m => ({ default: m.CustomReportViewPage })));
const WidgetLibraryPage = lazy(() => import('./pages/WidgetLibraryPage').then(m => ({ default: m.WidgetLibraryPage })));
const AIReportViewerPage = lazy(() => import('./pages/AIReportViewerPage').then(m => ({ default: m.AIReportViewerPage })));
const SharedReportPage = lazy(() => import('./pages/SharedReportPage').then(m => ({ default: m.SharedReportPage })));
const ScheduledReportsPage = lazy(() => import('./pages/ScheduledReportsPage').then(m => ({ default: m.ScheduledReportsPage })));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage').then(m => ({ default: m.UserManagementPage })));
const SchemaExplorerPage = lazy(() => import('./pages/SchemaExplorerPage').then(m => ({ default: m.SchemaExplorerPage })));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage').then(m => ({ default: m.KnowledgeBasePage })));
const CustomerProfileEditorPage = lazy(() => import('./pages/CustomerProfileEditorPage').then(m => ({ default: m.CustomerProfileEditorPage })));
const CustomerProfileHistoryPage = lazy(() => import('./pages/CustomerProfileHistoryPage').then(m => ({ default: m.CustomerProfileHistoryPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const HowToPage = lazy(() => import('./pages/HowToPage').then(m => ({ default: m.HowToPage })));
const DebugPage = lazy(() => import('./pages/DebugPage').then(m => ({ default: m.DebugPage })));
const AIUsageDashboardPage = lazy(() => import('./pages/AIUsageDashboardPage').then(m => ({ default: m.AIUsageDashboardPage })));
const WidgetRawDataPage = lazy(() => import('./pages/WidgetRawDataPage').then(m => ({ default: m.WidgetRawDataPage })));
const ReportViewPage = lazy(() => import('./pages/ReportViewPage').then(m => ({ default: m.ReportViewPage })));
const VisualBuilderPage = lazy(() => import('./admin/visual-builder').then(m => ({ default: m.VisualBuilderPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );
}

initializeWidgets();

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
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log('[LoginRedirect]', { isAuthenticated, isLoading, hasUser: !!user });

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
    console.log('[LoginRedirect] User is authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('[LoginRedirect] User not authenticated, showing login page');
  return <LoginPage />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ImpersonationGuardProvider>
            <ToastProvider>
              <Routes>
            <Route path="/login" element={<LoginRedirect />} />
            <Route path="/shared/reports/:token" element={<Suspense fallback={<PageLoader />}><SharedReportPage /></Suspense>} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<PulseDashboardPage />} />
              <Route path="dashboard/full" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
              <Route path="analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsHubPage /></Suspense>} />
              <Route path="shipments" element={<Suspense fallback={<PageLoader />}><ShipmentsPage /></Suspense>} />
              <Route path="shipments/:loadId" element={<Suspense fallback={<PageLoader />}><ShipmentDetailPage /></Suspense>} />
              <Route
                path="customers"
                element={
                  <ProtectedRoute requireAdmin>
                    <Suspense fallback={<PageLoader />}><CustomersPage /></Suspense>
                  </ProtectedRoute>
                }
              />
              <Route path="carriers" element={<Navigate to="/analytics" replace />} />

              {/* AI Studio - primary route */}
              <Route path="ai-studio" element={<Suspense fallback={<PageLoader />}><AIReportStudioPage /></Suspense>} />

              {/* Legacy redirects */}
              <Route path="analyze" element={<Navigate to="/ai-studio" replace />} />
              <Route path="create" element={<Navigate to="/ai-studio" replace />} />

              <Route path="reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
              <Route
                path="reports/avg-cost-per-unit"
                element={
                  <MetricProtectedRoute metricKey="avg-cost-per-unit">
                    <Suspense fallback={<PageLoader />}>
                      <AvgCostPerUnitPage />
                    </Suspense>
                  </MetricProtectedRoute>
                }
              />
              {/* Redirect old custom-reports to new unified reports page */}
              <Route path="custom-reports" element={<Navigate to="/reports" replace />} />
              <Route path="custom-reports/:reportId" element={<Suspense fallback={<PageLoader />}><CustomReportViewPage /></Suspense>} />
              <Route path="ai-reports/:reportId" element={<Suspense fallback={<PageLoader />}><AIReportViewerPage /></Suspense>} />
              <Route path="saved-reports/:reportId" element={<Suspense fallback={<PageLoader />}><ReportViewPage /></Suspense>} />
              <Route path="scheduled-reports" element={<Suspense fallback={<PageLoader />}><ScheduledReportsPage /></Suspense>} />
              <Route path="widget-library" element={<Suspense fallback={<PageLoader />}><WidgetLibraryPage /></Suspense>} />
              <Route path="widgets/:widgetId/data" element={<Suspense fallback={<PageLoader />}><WidgetRawDataPage /></Suspense>} />
              <Route
                path="users"
                element={
                  <ProtectedRoute requireAdmin>
                    <Suspense fallback={<PageLoader />}><UserManagementPage /></Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="schema"
                element={
                  <ProtectedRoute requireAdmin>
                    <Suspense fallback={<PageLoader />}><SchemaExplorerPage /></Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="knowledge-base"
                element={
                  <ProtectedRoute requireAdmin>
                    <Suspense fallback={<PageLoader />}>
                      <KnowledgeBasePage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/customer-profiles/:customerId/edit"
                element={
                  <ProtectedRoute requireAdmin>
                    <Suspense fallback={<PageLoader />}><CustomerProfileEditorPage /></Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/customer-profiles/:customerId/history"
                element={
                  <ProtectedRoute requireAdmin>
                    <Suspense fallback={<PageLoader />}><CustomerProfileHistoryPage /></Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="ai-learning"
                element={<Navigate to="/knowledge-base?tab=learning" replace />}
              />
              <Route
                path="admin/ai-usage"
                element={
                  <ProtectedRoute requireAdmin>
                    <Suspense fallback={<PageLoader />}>
                      <AIUsageDashboardPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/visual-builder"
                element={
                  <ProtectedRoute requireAdmin>
                    <Suspense fallback={<PageLoader />}><VisualBuilderPage /></Suspense>
                  </ProtectedRoute>
                }
              />
              <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
              <Route path="settings/how-to" element={<Suspense fallback={<PageLoader />}><HowToPage /></Suspense>} />
              <Route path="debug" element={<Suspense fallback={<PageLoader />}><DebugPage /></Suspense>} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </ToastProvider>
          </ImpersonationGuardProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
