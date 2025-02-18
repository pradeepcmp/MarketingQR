'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { useGeolocated } from 'react-geolocated';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { setCookie, getCookie } from 'cookies-next';
import { Option, FormData, LocationData, CombinedData } from './types';
import { Building2, Users, MapPin, ClipboardList } from 'lucide-react';
import useNotification from './Notificationsystem';

const AuthPage = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isFormDisabled, setIsFormDisabled] = useState(true);
  const [locationState, setLocationState] = useState({
    isLoading: true,
    showError: false,
    showSuccess: false,
    data: null as LocationData | null,
  });

  // State for dropdown options
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userTypes, setUserTypes] = useState<Option[]>([]);
  const [concerns, setConcerns] = useState<Option[]>([]);
  const [divisions, setDivisions] = useState<Option[]>([]);
  const [branches, setBranches] = useState<Option[]>([]);
  const [portalNames, setPortalNames] = useState<Option[]>([]);
  const [screens, setScreens] = useState<Option[]>([]);
  const [allData, setAllData] = useState<CombinedData | null>(null);
  const { showNotification, NotificationSystem } = useNotification();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      userCode: '',
      concern: '',
      division: '',
      branch: '',
      otp: '',
    },
  });

  const watchConcern = watch('concern');
  const watchDivision = watch('division');

  const { coords, isGeolocationEnabled } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
    },
    userDecisionTimeout: 5000,
    watchLocationPermissionChange: true,
  });

  // Enhanced location handling
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

      // Hide success message after 3 seconds
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

  // Unified location handling effect
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
        if (mounted) {
          if (locationInfo) {
            setLocationState((prev) => ({
              ...prev,
              showError: false,
              data: locationInfo,
            }));
            setIsFormDisabled(false);
          } else {
            setLocationState((prev) => ({
              ...prev,
              showError: true,
              data: null,
            }));
            setIsFormDisabled(true);
          }
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

  // The first useEffect
  useEffect(() => {
    const token = getCookie('token');
    if (token) {
      router.push('/');
    }
    setMounted(true);
    fetchCombinedData();
    // Only call getLocationAndIP if we have coordinates
    if (coords) {
      getLocationAndIP(coords.latitude, coords.longitude);
    }
  }, [router, coords]);

  // The second useEffect (Load initial data)
  useEffect(() => {
    setMounted(true);
    fetchCombinedData();
    // Only call getLocationAndIP if we have coordinates
    if (coords) {
      getLocationAndIP(coords.latitude, coords.longitude);
    }
  }, [coords]);

  // The third useEffect (Update filtered divisions)
  useEffect(() => {
    if (allData && watchConcern) {
      const filteredDivisions = allData.divisions.filter(
        (div: Option) => div.concern === watchConcern
      );
      setDivisions(filteredDivisions);
      setValue('division', '');
      setValue('branch', '');
    }
  }, [watchConcern, allData, setValue]);

  // Update filtered branches when division changes
  useEffect(() => {
    if (allData && watchDivision) {
      const divisionCode = watchDivision;
      // Find the selected division
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const selectedDivision = allData.divisions.find(
        (div: Option) => div.value === divisionCode
      );
      
      // Get branches for the selected division from divisionBranches
      const divisionBranches = allData.divisionBranches[divisionCode] || [];
      
      // Update branches state
      setBranches(divisionBranches);
      setValue('branch', ''); // Reset branch selection
    } else {
      // If no division is selected, reset branches
      setBranches([]);
      setValue('branch', '');
    }
  }, [watchDivision, allData, setValue]);

  const fetchCombinedData = async () => {
    try {
      const { data } = await axios.get(
        'https://cust.spacetextiles.net/getCombinedUserRoleData'
      );
      console.log(data.portalNames);
      setAllData(data);
      setUserTypes(data.userRoles || []);
      setConcerns(data.concerns || []);
      setPortalNames(data.portalNames || []);
      setScreens(data.screens || []);
      setDivisions([]);
      setBranches([]);
    } catch (error) {
      console.error('Error fetching combined data:', error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSuccessfulLogin = (response: any) => {
    const userData = {
      ...response.data.user,
      portalNames: portalNames || [],
      screens: screens || [],
      concern: watch('concern'),
      division: watch('division'),
      branch: watch('branch'),
      location: locationState.data?.locationName,
    };

    setCookie('token', response.data.token, {
      maxAge: 8 * 60 * 60,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    setCookie('user', JSON.stringify(userData), {
      maxAge: 8 * 60 * 60,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    router.push('/staffqr');
  };

  const verifyOTP = async (formData: FormData) => {
    if (!locationState.data) {
      alert('Please allow location access to continue');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await axios.post('https://cust.spacetextiles.net/order-verify-otp',
        {
          user_code: formData.userCode, 
          user_approval_concern: formData.concern,
          user_approval_branch: formData.branch,
          otp: formData.otp,
          location: locationState.data.locationName,
          ip: locationState.data.ip,
        }
      );

      if (response.data.success) {
        handleSuccessfulLogin(response);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      showNotification(
        error.response?.data?.message || 'Invalid OTP. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  //   const clearForm = () => {
  //     reset();
  //     setOtpSent(false);
  //     setErrorMessage('');
  //     // Clear any existing cookies
  //     setCookie('token', '', { maxAge: 0 });
  //     setCookie('user', '', { maxAge: 0 });
  //   };

  // Create axios instance with default config
  const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://cust.spacetextiles.net',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Clear cookies and redirect to login
        setCookie('token', '', { maxAge: 0 });
        setCookie('user', '', { maxAge: 0 });
        router.push('/');
      }
      return Promise.reject(error);
    }
  );

  const sendOTP = async (formData: FormData) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await api.post('/order-send-otp', {
        userCode: formData.userCode, 
        concern: formData.concern,
        division: formData.division,
        branch: formData.branch,
      });

      if (response.data.success) {
        setOtpSent(true);
        showNotification('OTP sent successfully!', 'success');
      } else {
        showNotification(response.data.message || 'Failed to send OTP');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      showNotification(
        error.response?.data?.message || 'Failed to send OTP. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (formData: FormData) => {
    if (!otpSent) {
      await sendOTP(formData);
    } else {
      await verifyOTP(formData);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[url('/grid-pattern.png')] bg-gray-50 relative">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10" />
      <div className="absolute inset-0 backdrop-blur-[1px]" />

      {/* Main content */}
      <div className="relative min-h-screen flex items-center justify-center p-4 md:p-6">
        <NotificationSystem />

        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-center">
          {/* Branding section - responsive for mobile */}
          <div className="w-full lg:w-1/2 px-2 sm:px-4 py-3 lg:py-0 lg:pr-8">
            <div className="space-y-2 sm:space-y-4 text-center lg:text-left">
              <div className="relative h-24 sm:h-32 lg:h-40 w-full">
                <Image
                  src="/SPACE LOGO 3D 03.png"
                  alt="Company Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              <h1 className="hidden md:block text-2xl md:text-3xl lg:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Marketing Management Portal
              </h1>

              <p className="hidden md:block text-gray-600 text-base md:text-xs leading-relaxed">
                Access your marketing dashboard, analytics, and campaign
                management tools in one secure location.
              </p>

              {/* Feature cards - responsive grid */}
              <div className="hidden md:grid md:grid-cols-2 gap-4 pt-6">
                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-md">
                  <Users className="w-6 h-6 md:w-8 md:h-8 text-blue-600 mb-2" />
                  <h3 className="font-semibold text-gray-900">
                    Team Management
                  </h3>
                  <p className="text-sm text-gray-600">
                    Coordinate with your team efficiently
                  </p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-md">
                  <ClipboardList className="w-6 h-6 md:w-8 md:h-8 text-purple-600 mb-2" />
                  <h3 className="font-semibold text-gray-900">
                    Campaign Tracking
                  </h3>
                  <p className="text-sm text-gray-600">
                    Monitor your marketing initiatives
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Login form card - mobile optimized */}
          <Card className="w-full lg:flex-1 bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl border-t border-white/50">
            <CardHeader className="space-y-2 text-center pb-6 md:pb-8 border-b border-gray-100">
              <h2 className="text-sm md:text-2xl font-semibold text-gray-900">
                Welcome Back
              </h2>
              <p className="text-xs text-gray-600">
                Please sign in to your account
              </p>
            </CardHeader>

            <CardContent className="pt-6 md:pt-8">
              {errorMessage && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

<form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-5">
        {/* User Code field */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium text-gray-700">
            <Users className="w-4 h-4 mr-2 text-blue-600" />
            User Code
          </label>
          <input
          type="text"
            {...register('userCode', {
              required: 'User code is required',
            })}
            className="w-full h-11 md:h-12 px-3 md:px-4 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm md:text-base"
          />
          {errors.userCode && (
            <p className="text-sm text-red-600 mt-1">
              {errors.userCode.message}
            </p>
          )}
        </div>

                {/* Concern field */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                    Concern
                  </label>
                  <select
                    {...register('concern', {
                      required: 'Concern is required',
                    })}
                    className="w-full h-11 md:h-12 px-3 md:px-4 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm md:text-base"
                    disabled={isFormDisabled}
                  >
                    <option value="">Select Concern</option>
                    {concerns.map((concern) => (
                      <option key={concern.value} value={concern.value}>
                        {concern.label}
                      </option>
                    ))}
                  </select>
                  {errors.concern && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.concern.message}
                    </p>
                  )}
                </div>

                {/* Division and Branch - Stack on mobile, side by side on tablet+ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                      Division
                    </label>
                    <select
                      {...register('division', {
                        required: 'Division is required',
                      })}
                      className="w-full h-11 md:h-12 px-3 md:px-4 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm md:text-base"
                      disabled={!watchConcern || isFormDisabled}
                    >
                      <option value="">Select Division</option>
                      {divisions.map((division) => (
                        <option key={division.value} value={division.value}>
                          {division.label}
                        </option>
                      ))}
                    </select>
                    {errors.division && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.division.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                      Branch
                    </label>
                    <select
                      {...register('branch', {
                        required: 'Branch is required',
                      })}
                      className="w-full h-11 md:h-12 px-3 md:px-4 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm md:text-base"
                      disabled={!watchDivision || isFormDisabled}
                    >
                      <option value="">Select Branch</option>
                         {branches.map((branch) => (
                         <option key={branch.value} value={branch.value}>
                                     {branch.label}
                              </option>
                      ))}
                    </select>
                    {errors.branch && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.branch.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* OTP field */}
                {otpSent && (
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <ClipboardList className="w-4 h-4 mr-2 text-blue-600" />
                      Enter OTP
                    </label>
                    <input
                      type="text"
                      {...register('otp', {
                        required: 'OTP is required',
                        pattern: {
                          value: /^\d{6}$/,
                          message: 'OTP must be 6 digits',
                        },
                      })}
                      className="w-full h-11 md:h-12 px-3 md:px-4 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm md:text-base"
                      placeholder="Enter 6-digit OTP"
                    />
                    {errors.otp && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.otp.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Action buttons - Full width on mobile */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 md:pt-6">
                  <button
                    type="submit"
                    disabled={isLoading || isFormDisabled}
                    className="w-full sm:flex-1 h-11 md:h-12 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/25 text-sm md:text-base"
                  >
                    {isLoading
                      ? 'Processing...'
                      : otpSent
                      ? 'Login'
                      : 'Send OTP'}
                  </button>

                  <button
                    type="button"
                    onClick={() => reset()}
                    disabled={isLoading || isFormDisabled}
                    className="w-full sm:w-auto px-6 h-11 md:h-12 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 focus:ring-4 focus:ring-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm md:text-base"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
