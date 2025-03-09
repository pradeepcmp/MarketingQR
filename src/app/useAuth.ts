import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';

interface UserData {
  user_code?: string;
  user_name?: string;
  user_role?: string;
  // Add fallback properties to handle different data structures
  screens?: Array<{
    value: string;
    label: string;
  }>;
  portalNames?: Array<{
    value: string;
    label: string;
  }>;
  // Additional properties from the response in LoginForm
  role?: string;
  portals?: Array<{
    value: string;
    label: string;
    screens?: Array<{
      value: string;
      label: string;
    }>;
  }>;
}

interface PortalWiseApproval {
  portal_name: string;
  screens: string[];
}

interface UserApprovalResponse {
  success: boolean;
  data: {
    portal_wise: PortalWiseApproval[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

interface AuthState {
  isAuthenticated: boolean;
  userRole: string | null;
  allowedScreens: string[];
  isLoading: boolean;
  lastUpdateTime: number;
  isUpdating: boolean;
}

const api = axios.create({
  baseURL: `https://cust.spacetextiles.net`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const decodeUserDataCookie = (): UserData => {
  try {
    const userCookieValue = Cookies.get('user');
    
    if (!userCookieValue) {
      throw new Error('User data cookie not found');
    }

    // Try to parse the cookie, checking if it needs decoding
    let decodedValue = userCookieValue;
    try {
      // Try to decode once
      decodedValue = decodeURIComponent(userCookieValue);
      // Check if it needs to be decoded again
      if (decodedValue.includes('%')) {
        decodedValue = decodeURIComponent(decodedValue);
      }
    } catch (e) {
      console.warn('Error decoding cookie, using original value', e);
    }

    const userData = JSON.parse(decodedValue) as UserData;
    console.log('Parsed user data:', userData);

    // Handle different data structures
    if (!userData.user_role && !userData.role) {
      throw new Error('Invalid user data: missing user role');
    }

    return userData;
  } catch (error) {
    console.error('Cookie parsing error:', error);
    throw error;
  }
};

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userRole: null,
    allowedScreens: [],
    isLoading: true,
    lastUpdateTime: 0,
    isUpdating: false
  });

  const updateUserData = useCallback(async () => {
    // Prevent concurrent updates and respect cooldown
    if (authState.isUpdating || 
        Date.now() - authState.lastUpdateTime < 5 * 60 * 1000) {
      return;
    }

    try {
      setAuthState(prev => ({ ...prev, isUpdating: true }));
      
      // Get current user data
      const currentUserData = decodeUserDataCookie();
      
      // Use the appropriate role field
      const userRole = currentUserData.user_role || currentUserData.role;
      
      if (!userRole) {
        throw new Error('No user role found');
      }
      
      // Fetch updated approvals
      const response = await api.get<UserApprovalResponse>(
        `/user-approvals/role/${encodeURIComponent(userRole)}`
      );

      if (!response.data.success || !response.data.data?.portal_wise) {
        throw new Error('Invalid approval data received');
      }

      // Process screens and portals
      const validScreens = response.data.data.portal_wise.flatMap(portal => 
        portal.screens.map(screen => ({
          value: screen,
          label: screen
        }))
      );

      const validPortals = response.data.data.portal_wise.map(portal => ({
        value: portal.portal_name,
        label: portal.portal_name
      }));

      // Check if data has changed
      const hasChanges = true; // Force update since we need to fix the structure

      if (hasChanges) {
        // Update cookie with new data
        const updatedUserData: UserData = {
          ...currentUserData,
          user_role: userRole,
          screens: validScreens,
          portalNames: validPortals
        };

        Cookies.set('user', encodeURIComponent(JSON.stringify(updatedUserData)), {
          expires: 1,
          path: '/'
        });

        // Update auth state
        const allowedScreens = validScreens.map(screen => `/${screen.value}`);
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
          userRole: userRole,
          allowedScreens,
          isLoading: false,
          lastUpdateTime: Date.now(),
          isUpdating: false
        }));
      } else {
        setAuthState(prev => ({
          ...prev,
          lastUpdateTime: Date.now(),
          isUpdating: false
        }));
      }
    } catch (error) {
      console.error('Failed to update user data:', error);
      setAuthState(prev => ({ ...prev, isUpdating: false }));

      // Try to use cached data if authentication failed
      if (!authState.isAuthenticated) {
        try {
          const userData = decodeUserDataCookie();
          
          // Extract screens from the user data structure
          let screens = userData.screens;
          
          // If screens is undefined, try to get them from portals if available
          if (!screens && userData.portals && userData.portals.length > 0) {
            screens = userData.portals[0].screens || [];
          }
          
          if (!screens || screens.length === 0) {
            throw new Error('No screens defined for this user');
          }
          
          const allowedScreens = screens.map(screen => `/${screen.value}`);
          const userRole = userData.user_role || userData.role;

          setAuthState(prev => ({
            ...prev,
            isAuthenticated: true,
            userRole: userRole || null,
            allowedScreens,
            isLoading: false,
            lastUpdateTime: Date.now()
          }));
        } catch (parseError) {
          console.error('Failed to parse cached user data:', parseError);
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: false,
            userRole: null,
            allowedScreens: [],
            isLoading: false
          }));
        }
      }
    }
  }, [authState.isUpdating, authState.lastUpdateTime, authState.isAuthenticated]);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      if (!mounted) return;
      try {
        const userData = decodeUserDataCookie();
        console.log('User data in checkAuth:', userData);

        // Extract screens from the user data structure
        let screens = userData.screens;
        
        // If screens is undefined, try to get them from portals if available
        if (!screens && userData.portals && userData.portals.length > 0) {
          screens = userData.portals[0].screens || [];
        }
        
        if (!screens || screens.length === 0) {
          console.warn('No screens defined for this user');
          screens = []; // Set default empty array to prevent errors
        }
        
        const allowedScreens = screens.map(screen => `/${screen.value}`);
        const userRole = userData.user_role || userData.role;

        if (mounted) {
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: true,
            userRole: userRole || null,
            allowedScreens,
            isLoading: false,
            lastUpdateTime: Date.now()
          }));

          await updateUserData();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (mounted) {
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: false,
            userRole: null,
            allowedScreens: [],
            isLoading: false,
            lastUpdateTime: 0
          }));
        }
      }
    };

    checkAuth();

    const updateInterval = setInterval(() => {
      if (mounted && navigator.onLine && !authState.isUpdating) {
        updateUserData();
      }
    }, 5 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(updateInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateUserData]);

  return authState;
};