import { useEffect, useState, useCallback } from 'react';

interface UserData {
  user_code: string;
  user_name: string;
  user_role: string;
  portalNames: Array<{
    value: string;
    label: string;
  }>;
  screens: Array<{
    value: string;
    label: string;
  }>;
}

interface UserApprovalResponse {
  success: boolean;
  data: Array<{
    user_role: string;
    user_portal: string;
    user_screen: string;
    portal_name: string;
    portal_screen: string;
    user_approval_concern: string;
    user_approval_branch: string;
    user_approval_branch_division: string;
  }>;
}

const getCookie = (name: string): string | null => {
  if (typeof document !== 'undefined') {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() ?? null;
  }
  return null;
};

const setCookie = (name: string, value: string, days: number = 1) => {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/`;
};

export const useAuth = () => {
    const [authState, setAuthState] = useState({
      isAuthenticated: false,
      userRole: null as string | null,
      allowedScreens: [] as string[],
      isLoading: true,
      lastUpdateTime: 0,
    });

  const updateUserData = useCallback(async () => {
    try {
      const userCookie = getCookie('user');
      if (!userCookie) {
        throw new Error('No user cookie found');
      }

      const currentUserData: UserData = JSON.parse(decodeURIComponent(userCookie));

      const response = await fetch('https://cust.spacetextiles.net/user-approvals', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user approvals: ${response.status}`);
      }

      const approvalData: UserApprovalResponse = await response.json();

      if (!approvalData.success || !Array.isArray(approvalData.data)) {
        throw new Error('Invalid approval data received');
      }

      const userApprovals = approvalData.data.filter(
        approval => approval.user_role === currentUserData.user_role
      );

      if (userApprovals.length === 0) {
        console.warn('No approvals found for current user role:', currentUserData.user_role);
      }

      const updatedScreens = [...new Set(userApprovals.map(approval => ({
        value: approval.portal_screen,
        label: approval.portal_screen
      })))];

      const updatedPortalNames = [...new Set(userApprovals.map(approval => ({
        value: approval.portal_name,
        label: approval.portal_name
      })))];

      const currentScreens = currentUserData.screens;
      const currentPortalNames = currentUserData.portalNames;

      const hasChanges = 
        JSON.stringify(updatedScreens) !== JSON.stringify(currentScreens) ||
        JSON.stringify(updatedPortalNames) !== JSON.stringify(currentPortalNames);

      if (hasChanges) {
        const updatedUserData: UserData = {
          ...currentUserData,
          screens: updatedScreens,
          portalNames: updatedPortalNames
        };

        setCookie('user', encodeURIComponent(JSON.stringify(updatedUserData)));

        const allowedScreens = updatedScreens.map(screen => `/${screen.value}`);
        
        setAuthState(prevState => ({
          ...prevState,
          isAuthenticated: true,
          userRole: updatedUserData.user_role || null,
          allowedScreens,
          isLoading: false,
          lastUpdateTime: Date.now()
        }));

        console.log('User data updated successfully:', {
          screens: updatedScreens.length,
          portals: updatedPortalNames.length
        });
      }

    } catch (error) {
      console.error('Failed to update user data:', error);
      if (Date.now() - authState.lastUpdateTime > 5 * 60 * 1000) {
        console.log('Attempting to retry update due to extended failure period');
        setTimeout(updateUserData, 5000);
      }
    }
  }, [authState.lastUpdateTime]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userCookie = getCookie('user');
        if (!userCookie) {
          throw new Error('No user cookie found');
        }

        const userData: UserData = JSON.parse(decodeURIComponent(userCookie));
        const allowedScreens = userData.screens.map(screen => `/${screen.value}`);

        setAuthState(prevState => ({
          ...prevState,
          isAuthenticated: true,
          userRole: userData.user_role || null,
          allowedScreens,
          isLoading: false,
          lastUpdateTime: Date.now()
        }));

        await updateUserData();

      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthState(prevState => ({
          ...prevState,
          isAuthenticated: false,
          userRole: null,
          allowedScreens: [],
          isLoading: false,
          lastUpdateTime: 0
        }));
      }
    };

    checkAuth();

    const updateInterval = setInterval(updateUserData, 30 * 1000);

    return () => clearInterval(updateInterval);
  }, [updateUserData]);

  return authState;
};