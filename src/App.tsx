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
import { logger } from './utils/logger';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AnalyticsHubPage = lazy(() => import('./pages/AnalyticsHubPage'));
const ShipmentsPage = lazy(() => import('./pages/ShipmentsPage'));
const ShipmentDetailPage = lazy(() => import('./pages/ShipmentDetailPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const AIReportStudioPage = lazy(() => import('./pages/AIReportStudioPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AvgCostPerUnitPage = lazy(() => import('./pages/AvgCostPerUnitPage'));
const CustomReportViewPage = lazy(() => import('./pages/CustomReportViewPage'));
const WidgetLibraryPage = lazy(() => import('./pages/WidgetLibraryPage'));
const AIReportViewerPage = lazy(() => import('./pages/AIReportViewerPage'));
const SharedReportPage = lazy(() => import('./pages/SharedReportPage'));
const ScheduledReportsPage = lazy(() => import('./pages/ScheduledReportsPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const SchemaExplorerPage = lazy(() => import('./pages/SchemaExplorerPage'));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage'));
const CustomerProfileEditorPage = lazy(() => import('./pages/CustomerProfileEditorPage'));
const CustomerProfileHistoryPage = lazy(() => import('./pages/CustomerProfileHistoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const HowToPage = lazy(() => import('./pages/HowToPage'));
const DebugPage = lazy(() => import('./pages/DebugPage'));
const AIUsageDashboardPage = lazy(() => import('./pages/AIUsageDashboardPage'));
const WidgetRawDataPage = lazy(() => import('./pages/WidgetRawDataPage'));
const ReportViewPage = lazy(() => import('./pages/ReportViewPage'));
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

  logger.log('[LoginRedirect]', { isAuthenticated, isLoading, hasUser: !!user });

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
    logger.log('[LoginRedirect] User is authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  logger.log('[LoginRedirect] User not authenticated, showing login page');
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
