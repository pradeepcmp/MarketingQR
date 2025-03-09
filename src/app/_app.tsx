"use strict";
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import type { AppProps } from 'next/app';
import ProtectedRoute from './protectedRoute';
import '../styles/globals.css';

interface UserData {
  user_code: string;
  user_name: string;
  user_role: string;
  portalNames: Array<{ value: string; label: string }>;
  screens: Array<{ value: string; label: string }>;
}

interface RoleApprovalResponse {
  success: boolean;
  role: string;
  data: {
    raw_approvals: Array<{
      user_role: string;
      user_portal: string | null;
      user_screen: string | null;
      user_approval_concern: string;
      user_approval_branch: string;
      user_approval_branch_division: string;
      portal_screen_valid: boolean;
    }>;
    portal_wise: Array<{
      portal_name: string;
      screens: string[];
      concerns: string[];
      branches: string[];
      divisions: string[];
    }>;
  };
}

interface RouteState {
  protectedRoutes: Set<string>;
  isLoading: boolean;
  error: string | null;
  lastUpdateTime: number;
  isAuthenticated: boolean;
}

const initialRouteState: RouteState = {
  protectedRoutes: new Set(),
  isLoading: true,
  error: null,
  lastUpdateTime: 0,
  isAuthenticated: false
};

// Public routes that don't need protection
const PUBLIC_ROUTES = new Set(['/']);
const ROUTE_UPDATE_INTERVAL = 30000; // 30 seconds

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
  return null;
};

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [routeState, setRouteState] = useState<RouteState>(initialRouteState);

  const fetchRoleApprovals = useCallback(async (role: string): Promise<RoleApprovalResponse> => {
    const response = await fetch(`https://cust.spacetextiles.net/user-approvals/role/${encodeURIComponent(role)}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch role approvals: ${response.status}`);
    }

    return response.json();
  }, []);

  const updateRouteProtection = useCallback(async () => {
    try {
      const userCookie = getCookie('user');
      if (!userCookie) {
        setRouteState(prevState => ({
          ...prevState,
          isAuthenticated: false,
          isLoading: false
        }));
        return;
      }

      const userData: UserData = JSON.parse(decodeURIComponent(userCookie));
      if (!userData.user_role) {
        throw new Error('Invalid user role in cookie');
      }

      const approvalData = await fetchRoleApprovals(userData.user_role);

      if (!approvalData.success || !approvalData.data) {
        throw new Error('Invalid approval data received');
      }

      const validScreenRoutes = new Set(
        approvalData.data.raw_approvals
          .filter(approval => 
            approval.portal_screen_valid && 
            approval.user_screen !== null
          )
          .map(approval => `/${approval.user_screen!.toLowerCase()}`)
      );

      setRouteState(prevState => ({
        ...prevState,
        protectedRoutes: validScreenRoutes,
        isLoading: false,
        error: null,
        lastUpdateTime: Date.now(),
        isAuthenticated: true
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Failed to update route protection:', error);
      
      setRouteState(prevState => ({
        ...prevState,
        error: errorMessage,
        isLoading: false,
        isAuthenticated: false
      }));

      if (Date.now() - routeState.lastUpdateTime > 5 * 60 * 1000) {
        setTimeout(updateRouteProtection, 5000);
      }
    }
  }, [fetchRoleApprovals, routeState.lastUpdateTime]);

  // Enhanced route change handler
  const handleRouteChange = useCallback((url: string) => {
    const normalizedUrl = url.toLowerCase();
    const isPublicRoute = PUBLIC_ROUTES.has(normalizedUrl);
    const hasAccess = routeState.protectedRoutes.has(normalizedUrl);

    if (!routeState.isAuthenticated && !isPublicRoute) {
      router.push('/');
      return;
    }

    if (routeState.isAuthenticated && !hasAccess && !isPublicRoute) {
      router.push('/unauthorized');
      return;
    }
  }, [router, routeState.isAuthenticated, routeState.protectedRoutes]);

  // Initial route check
  useEffect(() => {
    const currentPath = router.pathname.toLowerCase();
    if (!routeState.isLoading) {
      handleRouteChange(currentPath);
    }
  }, [router.pathname, routeState.isLoading, handleRouteChange]);

  // Initial setup and periodic updates
  useEffect(() => {
    updateRouteProtection();
    const updateInterval = setInterval(updateRouteProtection, ROUTE_UPDATE_INTERVAL);
    return () => clearInterval(updateInterval);
  }, [updateRouteProtection]);

  // Route change listener
  useEffect(() => {
    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router, handleRouteChange]);

  // Memoized route protection check
  const isProtectedRoute = useMemo(() => {
    const currentPath = router.pathname.toLowerCase();
    return !PUBLIC_ROUTES.has(currentPath);
  }, [router.pathname]);

  if (routeState.isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg font-semibold">Loading...</div>
    </div>;
  }

  if (routeState.error) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-red-600 font-semibold">Error: {routeState.error}</div>
    </div>;
  }

  return (
    <>
      {isProtectedRoute ? (
        <ProtectedRoute>
          <Component {...pageProps} />
        </ProtectedRoute>
      ) : (
        <Component {...pageProps} />
      )}
    </>
  );
}

export default MyApp;