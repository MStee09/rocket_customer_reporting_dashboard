import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { initializeWidgets } from './widgets/init';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PulseDashboardPage } from './pages/PulseDashboardPage';
import { AnalyticsHubPage } from './pages/AnalyticsHubPage';
import { ShipmentsPage } from './pages/ShipmentsPage';
import { ShipmentDetailPage } from './pages/ShipmentDetailPage';
import { CustomersPage } from './pages/CustomersPage';
import { AIReportStudioPage } from './pages/AIReportStudioPage';
import { ReportsPage } from './pages/ReportsPage';
import { AvgCostPerUnitPage } from './pages/AvgCostPerUnitPage';
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
import { AIUsageDashboardPage } from './pages/AIUsageDashboardPage';
import { WidgetRawDataPage } from './pages/WidgetRawDataPage';
import { ReportViewPage } from './pages/ReportViewPage';
import { VisualBuilderPage, VisualBuilderPageV3, VisualBuilderV4, VisualBuilderV5, VisualBuilderV6 } from './admin/visual-builder';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MetricProtectedRoute } from './components/MetricProtectedRoute';
import { ToastProvider } from './components/ui/Toast';
import { ImpersonationGuardProvider } from './components/ui/ImpersonationGuard';
import { Loader2 } from 'lucide-react';

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
          <ImpersonationGuardProvider>
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
              <Route path="dashboard" element={<PulseDashboardPage />} />
              <Route path="dashboard/full" element={<DashboardPage />} />
              <Route path="analytics" element={<AnalyticsHubPage />} />
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
              <Route path="carriers" element={<Navigate to="/analytics" replace />} />

              {/* AI Studio - primary route */}
              <Route path="ai-studio" element={<AIReportStudioPage />} />

              {/* Legacy redirects */}
              <Route path="analyze" element={<Navigate to="/ai-studio" replace />} />
              <Route path="create" element={<Navigate to="/ai-studio" replace />} />

              <Route path="reports" element={<ReportsPage />} />
              <Route
                path="reports/avg-cost-per-unit"
                element={
                  <MetricProtectedRoute metricKey="avg-cost-per-unit">
                    <AvgCostPerUnitPage />
                  </MetricProtectedRoute>
                }
              />
              {/* Redirect old custom-reports to new unified reports page */}
              <Route path="custom-reports" element={<Navigate to="/reports" replace />} />
              <Route path="custom-reports/:reportId" element={<CustomReportViewPage />} />
              <Route path="ai-reports/:reportId" element={<AIReportViewerPage />} />
              <Route path="saved-reports/:reportId" element={<ReportViewPage />} />
              <Route path="scheduled-reports" element={<ScheduledReportsPage />} />
              <Route path="widget-library" element={<WidgetLibraryPage />} />
              <Route path="widgets/:widgetId/data" element={<WidgetRawDataPage />} />
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
              <Route
                path="admin/ai-usage"
                element={
                  <ProtectedRoute requireAdmin>
                    <AIUsageDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/visual-builder"
                element={
                  <ProtectedRoute requireAdmin>
                    <VisualBuilderPage />
                  </ProtectedRoute>
                }
              />
              <Route path="admin/visual-builder-v3" element={<VisualBuilderPageV3 />} />
              <Route
                path="admin/visual-builder-v4"
                element={
                  <ProtectedRoute requireAdmin>
                    <VisualBuilderV4 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/visual-builder-v5"
                element={
                  <ProtectedRoute requireAdmin>
                    <VisualBuilderV5 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/visual-builder-v6"
                element={
                  <ProtectedRoute requireAdmin>
                    <VisualBuilderV6 />
                  </ProtectedRoute>
                }
              />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/how-to" element={<HowToPage />} />
              <Route path="debug" element={<DebugPage />} />
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
