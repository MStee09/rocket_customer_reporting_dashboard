import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ShipmentsPage } from './pages/ShipmentsPage';
import { ShipmentDetailPage } from './pages/ShipmentDetailPage';
import { CustomersPage } from './pages/CustomersPage';
import { CarriersPage } from './pages/CarriersPage';
import { CreatePage } from './pages/CreatePage';
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
              <Route path="create" element={<CreatePage />} />
              <Route path="analytics" element={<Navigate to="/create" replace />} />
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
              <Route path="ai-studio" element={<Navigate to="/create?tab=ai-studio" replace />} />
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
