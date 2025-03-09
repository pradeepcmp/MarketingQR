"use client"
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated, allowedScreens, isLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const lastCheckedPath = useRef<string>('');
  const authCheckTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const checkAuthorization = useCallback(() => {
    // Clear any pending checks
    if (authCheckTimeout.current) {
      clearTimeout(authCheckTimeout.current);
    }

    const currentPath = window.location.pathname;

    // Skip if we've already checked this path and nothing has changed
    if (
      currentPath === lastCheckedPath.current && 
      isAuthorized && 
      !isLoading
    ) {
      return;
    }

    // Update the last checked path
    lastCheckedPath.current = currentPath;

    // Handle public routes
    if (currentPath === '/') {
      setIsAuthorized(true);
      return;
    }

    // Set a timeout to ensure we have the latest auth state
    authCheckTimeout.current = setTimeout(() => {
      if (!isAuthenticated && !isLoading) {
        router.push('/');
        return;
      }

      const isPathAllowed = allowedScreens.some(screen => {
        // Exact match
        if (screen === currentPath) return true;
        // Case-insensitive match
        if (screen.toLowerCase() === currentPath.toLowerCase()) return true;
        return false;
      });
console.info("validpath",isPathAllowed)
      if (isPathAllowed) {
        setIsAuthorized(true);
      }
    }, 100);

  }, [isAuthenticated, isLoading, allowedScreens, router, isAuthorized]);

  // Initial check on mount and auth state changes
  useEffect(() => {
    checkAuthorization();
  }, [checkAuthorization, isAuthenticated, isLoading, allowedScreens]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (authCheckTimeout.current) {
        clearTimeout(authCheckTimeout.current);
      }
    };
  }, []);

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