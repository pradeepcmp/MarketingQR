"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const LogoutButton = () => {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const clearSpecificCookies = () => {
    try {
      const cookiesToClear = ['user', 'token', 'auth_token', 'session'];
      const paths = ['/', '/login', '/ho_reports', '/ho_accept', '/homepage', '/branch_rpt'];
      
      cookiesToClear.forEach(cookieName => {
        paths.forEach(path => {
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}`;
        });
      });
      
      return true;
    } catch (e) {
      console.error('Error clearing cookies:', e);
      return false;
    }
  };

  const getUserDataFromCookie = () => {
    try {
      const cookies = document.cookie.split(';');
      
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        
        if (name.trim() === 'user') {
          const decodedValue = decodeURIComponent(value);
          const userData = JSON.parse(decodedValue);
          
          if (userData && userData.user_code) {
            return {
              user_code: userData.user_code,
              user_name: userData.user_name
            };
          }
        }
      }
      return null;
    } catch (e) {
      console.error('Error getting user data from cookie:', e);
      return null;
    }
  };

  const handleLogout = async () => {
    try {
      const userData = getUserDataFromCookie();

      if (!userData || !userData.user_code) {
        clearSpecificCookies();
        router.push('/');
        return;
      }

      const response = await api.post('https://cust.spacetextiles.net/order-logout', { 
        user_code: userData.user_code 
      });

      if (response.data.success) {
        clearSpecificCookies();
        router.push('/');
      } else {
        throw new Error(response.data.message || 'Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      clearSpecificCookies();
      setErrorMessage('Logging out...');
      setError(true);
      setTimeout(() => router.push('/staffqr'), 1500);
    }
  };

  return (
    <div className="relative">
      {error && (
        <div className="absolute right-0 -top-16 w-72">
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        </div>
      )}
      <Button
        onClick={handleLogout}
        size="sm"
        className={cn(
          "bg-blue-500 hover:bg-blue-600 transition-all duration-300",
          "rounded-full px-3 py-2",
          "hover:scale-105"
        )}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default LogoutButton;