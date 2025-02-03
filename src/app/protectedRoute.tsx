"use strict";

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { isPathAllowed, isAlwaysAllowedRoute } from './allowedRoutes';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated, allowedScreens, isLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const checkAuthorization = useCallback(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    const currentPath = window.location.pathname;
    
    // Check if current path is in always allowed routes
    if (isAlwaysAllowedRoute(currentPath)) {
      setIsAuthorized(true);
      return;
    }

    // Special handling for staffqr
    if (currentPath === '/staffqr' && isAuthenticated) {
      setIsAuthorized(true);
      return;
    }

    // Check if path is allowed based on user permissions
    if (isPathAllowed(currentPath, allowedScreens, isAuthenticated)) {
      setIsAuthorized(true);
    } else {
      router.push('/unauthorized');
    }
  }, [isAuthenticated, isLoading, allowedScreens, router]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkAuthorization();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [checkAuthorization]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;