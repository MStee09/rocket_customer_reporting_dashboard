import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { logger } from '../utils/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isAdmin, isViewingAsCustomer, user } = useAuth();

  logger.log('[ProtectedRoute]', {
    isAuthenticated,
    isLoading,
    requireAdmin,
    isAdmin: isAdmin(),
    isViewingAsCustomer,
    hasUser: !!user
  });

  if (isLoading) {
    logger.log('[ProtectedRoute] Still loading auth state...');
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-rocket-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    logger.log('[ProtectedRoute] User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && (!isAdmin() || isViewingAsCustomer)) {
    logger.log('[ProtectedRoute] Admin required but user is not admin, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  logger.log('[ProtectedRoute] Auth check passed, rendering children');
  return <>{children}</>;
}
