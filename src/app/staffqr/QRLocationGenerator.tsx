'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Coins,
  Sparkles,
  QrCode,
  MapPin,
  UserCircle,
  AlertCircle,
} from 'lucide-react';
import SecureQRGenerator from './SecurestaffQR';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useGeolocated } from 'react-geolocated';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image'
import LogoutButton from './Logout'
import PrivateRoute from '../protectedRoute'

interface CoinData {
  ecno: string;
  location: string;
  ip: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  crm_ecno: string;
  coins: number;
  todayCoins: number;
}

interface LocationData {
  locationName: string;
  ip: string;
}

interface LocationState {
  isLoading: boolean;
  showError: boolean;
  showSuccess: boolean;
  data: LocationData | null;
}

interface UserData {
  user_code: string;
  user_name: string;
  user_role: string;
  branch: string;
}

const QRGeneratorPage = () => {
  const [ecno, setEcno] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, setError] = useState('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isFormDisabled, setIsFormDisabled] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [locationState, setLocationState] = useState<LocationState>({
    isLoading: true,
    showError: false,
    showSuccess: false,
    data: null,
  });

  // Geolocation hook
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { coords, isGeolocationEnabled, getPosition } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
    },
    userDecisionTimeout: 5000,
    watchLocationPermissionChange: true,
  });

  // Location and IP fetching
  const getLocationAndIP = async (latitude: number, longitude: number) => {
    try {
      const [locationResponse, ipResponse] = await Promise.all([
        axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
        ),
        axios.get('https://api.ipify.org?format=json'),
      ]);

      const address = locationResponse.data.address;
      let locationString = '';

      if (address.suburb) locationString += address.suburb;
      if (address.city_district)
        locationString += (locationString ? ', ' : '') + address.city_district;
      if (address.city)
        locationString += (locationString ? ', ' : '') + address.city;

      const newLocationData = {
        locationName: locationString || 'Unknown Location',
        ip: ipResponse.data.ip,
      };

      setLocationState((prev) => ({
        ...prev,
        isLoading: false,
        showSuccess: true,
        showError: false,
        data: newLocationData,
      }));

      setIsFormDisabled(false);

      setTimeout(() => {
        setLocationState((prev) => ({
          ...prev,
          showSuccess: false,
        }));
      }, 3000);

      return newLocationData;
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationState((prev) => ({
        ...prev,
        isLoading: false,
        showError: true,
        showSuccess: false,
        data: null,
      }));
      setIsFormDisabled(true);
      return null;
    }
  };

  useEffect(() => {
    const cookieData = decodeURIComponent(document.cookie)
      .split(';')
      .find((row) => row.trim().startsWith('user='));

    if (cookieData) {
      try {
        const parsedData = JSON.parse(cookieData.split('=')[1]);
        setUserData(parsedData);
        setEcno(parsedData.user_code);
        // Fetch coin data for the user automatically
        fetchCoinData(parsedData.user_code);
      } catch (error) {
        console.error('Error parsing cookie data:', error);
      }
    }
  }, []);
  console.log(userData);
  // Location update effect
  useEffect(() => {
    let mounted = true;

    const handleLocationUpdate = async () => {
      if (!mounted) return;

      setLocationState((prev) => ({
        ...prev,
        isLoading: true,
        showError: false,
      }));

      if (coords) {
        const locationInfo = await getLocationAndIP(
          coords.latitude,
          coords.longitude
        );
        if (mounted && locationInfo) {
          setLocationState((prev) => ({
            ...prev,
            showError: false,
            data: locationInfo,
          }));
          setIsFormDisabled(false);
        }
      } else if (isGeolocationEnabled === false) {
        if (mounted) {
          setLocationState((prev) => ({
            ...prev,
            isLoading: false,
            showError: true,
            data: null,
          }));
          setIsFormDisabled(true);
        }
      }
    };

    handleLocationUpdate();
    return () => {
      mounted = false;
    };
  }, [coords, isGeolocationEnabled]);

  // Fetch coin data
  const fetchCoinData = async (ecnoValue: string) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.get(`https://cust.spacetextiles.net/marketing-staff/${ecnoValue}`);
      const data = response.data;

      if (data && data.ecno) {
        const coinDataObject: CoinData = {
          ecno: data.ecno,
          crm_ecno: data.ecno,
          coins: data.coins || 0,
          todayCoins: data.todayCoins || 0,
          location: data.location,
          ip: data.ip,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp
        };
        
        setCoinData(coinDataObject);

        // Update location state if location data exists
        if (data.location && data.ip) {
          setLocationState(prev => ({
            ...prev,
            data: {
              locationName: data.location,
              ip: data.ip
            }
          }));
        }
      } else {
        setError('No data found for this ECNO');
        setCoinData(null);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setError('No data found for this ECNO');
      } else {
        console.error('Error fetching coin data:', error);
        setError('Failed to fetch coin data');
      }
      setCoinData(null);
    } finally {
      setIsLoading(false);
    }
  };


  // Update the useEffect hook that calls fetchCoinData
  useEffect(() => {
    const cookieData = decodeURIComponent(document.cookie)
      .split(';')
      .find((row) => row.trim().startsWith('user='));

    if (cookieData) {
      try {
        const parsedData = JSON.parse(cookieData.split('=')[1]);
        setUserData(parsedData);
        setEcno(parsedData.user_code);
        // Fetch coin data for the user automatically
        if (parsedData.user_code) {
          fetchCoinData(parsedData.user_code);
        }
      } catch (error) {
        console.error('Error parsing cookie data:', error);
      }
    }
  }, []);

  const handleGenerateClick = async () => {
    if (!locationState.data) {
      setError('Location access is required');
      return;
    }
  
    setIsGenerating(true);
    setIsTimerRunning(true);
  
    try {
      // Generate reference code and session ID
      const baseNumber = parseInt(ecno, 10);
      if (isNaN(baseNumber)) {
        throw new Error('Invalid ECNO');
      }
      const referenceCode = (baseNumber + 15).toString().padStart(6, '0');
      const randomString = Math.random().toString(36).substring(2, 11);
      const sessionId = `${ecno}-${Date.now()}-${randomString}`;
  
      // Prepare data for database storage
      const locationData = {
        ecno: userData?.user_code,
        user_name: userData?.user_name,
        user_role: userData?.user_role,
        reference_code: referenceCode,
        session_id: sessionId,
        branch: userData?.branch,
        location_name: locationState.data.locationName,
        ip_address: locationState.data.ip,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        timestamp: new Date().toISOString(),
      };
  
      // Store location data
      const response = await axios.post('https://cust.spacetextiles.net/store-location', locationData);
  console.log(locationData)
      if (response.status === 200) {
        setShowQR(true);
      } else {
        throw new Error('Failed to store location data');
      }
  
    } catch (error) {
      console.error('Error storing location data:', error);
      setError('Failed to store location data');
      setIsGenerating(false);
      setIsTimerRunning(false);
    }
  };

  const handleQRError = (error: string) => {
    setShowQR(false);
    setError(error);
    setIsGenerating(false);
    setIsTimerRunning(false);
  };

  const handleQRSuccess = (qrData: {
    url: string;
    ecno: string;
    referenceCode: string;
    timestamp: string;
    sessionId: string;
    location?: LocationData;
  }) => {
    console.log('QR Generated:', qrData);
  };

  const handleQRExpire = () => {
    setShowQR(false);
    setIsGenerating(false);
    setIsTimerRunning(false);
  };

  const renderCoinsInformation = () => (
<div className="w-full">
      {/* Container with responsive flex layout */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 px-1">
        {coinData && (
          <>
            {/* Cards container - full width on mobile, auto on desktop */}
            <div className="w-full md:w-auto flex flex-row justify-between md:justify-start gap-4">
              {/* Today's Coins - wider on mobile */}
              <Card className="bg-white shadow-sm border-0 w-[45%] md:w-48">
                <CardContent className="flex items-center p-3 md:p-4">
                  <div className="flex items-center">
                    <Sparkles className="h-5 w-5 md:h-6 md:w-6 mr-2 text-amber-500" />
                    <div>
                      <p className="text-xs md:text-sm text-gray-600">Today&apos;s Customer</p>
                      <p className="text-lg md:text-2xl font-bold">{coinData.todayCoins}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Coins - wider on mobile */}
              <Card className="bg-white shadow-sm border-0 w-[45%] md:w-48">
                <CardContent className="flex items-center p-3 md:p-4">
                  <div className="flex items-center">
                    <Coins className="h-5 w-5 md:h-6 md:w-6 mr-2 text-purple-500" />
                    <div>
                      <p className="text-xs md:text-sm text-gray-600">Total Customer</p>
                      <p className="text-lg md:text-2xl font-bold">{coinData.coins}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </>
        )}
      </div>
    </div>
  );


  return (
    <PrivateRoute>
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto relative">
        {/* Top Bar with Coins and Logout */}
        {renderCoinsInformation()}

        {/* Location Status */}
        <AnimatePresence>
          {locationState.showError && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4"
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Location access is required. Please enable location services
                  and refresh the page.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {locationState.showSuccess && locationState.data && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4"
            >
              <Alert className="bg-green-50 border-green-200">
                <MapPin className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  Location access granted: {locationState.data.locationName}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main QR Generator Card */}
        <Card className={`shadow-xl bg-white ${isFormDisabled ? 'opacity-75' : ''}`}>
        <div className="absolute top-4 right-4 z-10">
          <LogoutButton />
        </div>
          <CardHeader className="space-y-1 border-b bg-gray-50/50">
            <div className="relative h-20 sm:h-20 lg:h-20 w-full">
              <Image
                src="/SPACE LOGO 3D 03.png"
                alt="Company Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="flex items-center justify-center space-x-2">
              <QrCode className="h-6 w-6 text-primary" />
              <CardTitle className="text-sm font-bold text-center">
                Marketing QR Generator
              </CardTitle>
            </div>
            {/* <p className="text-center text-xs text-gray-600">
              Generate secure QR codes for staff verification
            </p> */}
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* User Info Card */}
            {userData && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                  <CardContent className="flex items-center p-4">
                    <UserCircle className="h-6 w-6 text-primary mr-2" />
                    <div>
                      <p className="text-lg font-medium">
                        Welcome, {userData.user_name}
                      </p>
                      <p className="text-sm text-gray-600">{userData.user_role}</p>
                    </div>
                  </CardContent>
              </motion.div>
            )}

            {/* Generate QR Button */}
            <div className="space-y-4">
              <Button
                onClick={handleGenerateClick}
                className="w-full h-12 text-base"
                disabled={
                  !userData?.user_code || 
                  isLoading || 
                  isFormDisabled || 
                  isGenerating || 
                  isTimerRunning
                }
                variant="default"
              >
                <QrCode className="mr-2 h-5 w-5" />
                Generate
              </Button>
            </div>

            {/* QR Code Display */}
            {showQR && (
              <div className="mt-6 border-t pt-6">
                <SecureQRGenerator
                  ecno={ecno}
                  onError={handleQRError}
                  onSuccess={handleQRSuccess}
                  onExpire={handleQRExpire}
                  locationData={locationState.data}
                  startTimer={isTimerRunning}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-500 mt-4">
          QR codes are valid for Customer Registration purposes only
        </p>
      </div>
    </div>
    </PrivateRoute>
  );
};

export default QRGeneratorPage;