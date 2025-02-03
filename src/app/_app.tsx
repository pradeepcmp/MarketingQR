"use strict"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { AppProps } from 'next/app';
import ProtectedRoute from '../app/protectedRoute';
import '../styles/globals.css';

interface UserApproval {
  user_role: string;
  user_portal: string;
  user_screen: string;
  user_approval_concern: string;
  user_approval_branch: string;
  user_approval_branch_division: string;
}

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [protectedRoutes, setProtectedRoutes] = useState<string[]>([]);

  // Define public routes that don't need protection
  const publicRoutes = ['/', '/login'];

  useEffect(() => {
    // Fetch user approvals and update protected routes
    const fetchUserApprovals = async () => {
      try {
        const response = await fetch('https://cust.spacetextiles.net/user-approvals');
        const data = await response.json();
        
        if (data.success) {
          // Extract screens and convert them to routes
          const screenRoutes = data.data.map((approval: UserApproval) => 
            `/${approval.user_screen.toLowerCase()}`
          );
          
          // Update protected routes with dynamic screens
          setProtectedRoutes(prevRoutes => [
            ...new Set([...prevRoutes, ...screenRoutes])
          ]);
        }
      } catch (error) {
        console.error('Error fetching user approvals:', error);
      }
    };

    fetchUserApprovals();
  }, []);

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // If trying to access homepage directly, redirect to login
      if (url === '/staffqr' && router.pathname !== '/') {
        router.push('/');
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  // Check if current route needs protection
  const isProtectedRoute = protectedRoutes.includes(router.pathname) || 
                          !publicRoutes.includes(router.pathname);

  // Add loading state while fetching routes
  if (protectedRoutes.length === 0) {
    return <div>Loading...</div>; // You can replace this with a proper loading component
  }

  return isProtectedRoute ? (
    <ProtectedRoute>
      <Component {...pageProps} />
    </ProtectedRoute>
  ) : (
    <Component {...pageProps} />
  );
}

export default MyApp;