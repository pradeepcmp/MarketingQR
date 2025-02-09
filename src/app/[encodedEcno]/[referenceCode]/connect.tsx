/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store/store';
import { setFormData } from './store/formSlice';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, RefreshCw, Send, ArrowRight, ArrowLeft } from 'lucide-react';
import Cookies from 'js-cookie';
import { useGeolocated } from 'react-geolocated';
import { useRouter, useParams } from 'next/navigation';
import CHIT_API from './config';
import LeftBanner from './LeftBanner';
import SecureQRGenerator from './SecureQRGenerator';
import WifiStatus from './hooks/Wifistatus';
import { SkeletonLoader } from './LoadingStates';

// Dynamically import components (keeping your existing imports)
const QRCode = dynamic(() => import('qrcode.react').then((mod) => mod.QRCodeSVG), {
  loading: () => <div>Loading QR Code...</div>,
  ssr: false,
});

const Step1 = dynamic(() => import('./Step1'), {
  loading: () => <div className="animate-pulse"><SkeletonLoader /></div>,
});

const Step2 = dynamic(() => import('./Step2'), {
  loading: () => <div className="animate-pulse"><SkeletonLoader /></div>,
});

const Step3 = dynamic(() => import('./Step3'), {
  loading: () => <div className="animate-pulse"><SkeletonLoader /></div>,
});

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error';
}

// Interfaces
interface URLParams {
  encodedEcno?: string;
  referenceCode?: string;
}
interface LocationData {
  locationName: string;
  ip: string;
}

interface LocationState {
  isLoading: boolean;
  showSuccess: boolean;
  showError: boolean;
  data: LocationData | null;
}

interface FormState {
  currentStep: number;
  formSubmitted: boolean;
  otpSent: boolean;
  otpVerified: boolean;
  submissionTimestamp: number | null;
}

interface StoredFormData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  timestamp: number;
  formState: FormState;
}

const EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds
const COOKIE_NAME = 'formData';
const COOKIE_EXPIRES = 1 / 144; // 10 minutes in days (1/144 of a day)

// Cookie helper functions
const setCookieData = (data: StoredFormData) => {
  try {
    Cookies.set(COOKIE_NAME, JSON.stringify(data), {
      expires: COOKIE_EXPIRES,
      sameSite: 'strict',
      // secure: process.env.NODE_ENV === 'production'
    });
  } catch (error) {
    console.error('Error setting cookie:', error);
  }
};

const getCookieData = (): StoredFormData | null => {
  try {
    const cookieData = Cookies.get(COOKIE_NAME);
    return cookieData ? JSON.parse(cookieData) : null;
  } catch (error) {
    console.error('Error parsing cookie:', error);
    return null;
  }
};

const clearCookieData = () => {
  Cookies.remove(COOKIE_NAME);
};
// const CHIT_API = process.env.NEXT_PUBLIC_CHIT_API || "https://cust.spacetextiles.net";
export default function MultiStepForm() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [showQrPopup, setShowQrPopup] = useState(false);
  const [otp, setOtp] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isStepValid, setIsStepValid] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [timer, setTimer] = useState(60);
  const [otpVerified, setOtpVerified] = useState(false);
  const [submissionTimestamp, setSubmissionTimestamp] = useState<number | null>(
    null
  );
  const [mobileExists, setMobileExists] = useState(false);
  const [isPendingStatus, setIsPendingStatus] = useState(false);
  const [urlParams, setUrlParams] = useState({ encodedEcno: '', referenceCode: '' });
  const [locationState, setLocationState] = useState<LocationState>({
    isLoading: true,
    showSuccess: false,
    showError: false,
    data: null
  });
  const [isFormDisabled, setIsFormDisabled] = useState(true);

  const otpInputRef = useRef<HTMLInputElement>(null);
  const formData = useSelector((state: RootState) => state.form);

  useEffect(() => {
    const path = window.location.pathname;
    const pathParts = path.split('/').filter(Boolean);

    if (pathParts.length >= 2) {
      setUrlParams({
        encodedEcno: pathParts[0],
        referenceCode: pathParts[1],
      });
    } else {
      addNotification('Invalid URL format. Please check the URL.', 'error');
    }
  }, []);

  const validateStep = useCallback(() => {
    let isValid = false;
    switch (step) {
      case 1:
        isValid = Boolean(
          formData.customerTitle?.trim() &&
            formData.customerName?.trim() &&
            formData.mobileNo?.trim().length === 10 &&
            formData.CustomerType?.trim() &&
            formData.email?.trim() &&
            (!mobileExists || (mobileExists && isPendingStatus))
        );
        break;
      case 2:
        isValid = Boolean(
          formData.doorNo?.trim() &&
            formData.street?.trim() &&
            formData.pinCode?.trim() &&
            formData.area?.trim()
        );
        break;
      case 3:
        isValid = Boolean(
          formData.customerTitle?.trim() &&
            formData.customerName?.trim() &&
            formData.mobileNo?.trim().length === 10 &&
            formData.CustomerType?.trim() &&
            formData.email?.trim() &&
            formData.doorNo?.trim() &&
            formData.street?.trim() &&
            formData.pinCode?.trim() &&
            formData.area?.trim() &&
            (!mobileExists || (mobileExists && isPendingStatus))
        );
        break;
    }
    return isValid;
  }, [step, formData, mobileExists, isPendingStatus]);

  const { coords, isGeolocationEnabled } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    },
    userDecisionTimeout: 5000,
    watchLocationPermissionChange: true,
    onError: (error) => {
      console.error('Geolocation error:', error);
      addNotification('Failed to get location. Please enable location services.', 'error');
      setLocationState(prev => ({
        ...prev,
        isLoading: false,
        showError: true
      }));
      setIsFormDisabled(true);
    }
  });

  // Improved decoding function
  const decodeMultipleTimes = useCallback((encodedText: string, times: number): string => {
    let decoded = encodedText;
    try {
      for (let i = 0; i < times; i++) {
        decoded = decodeURIComponent(atob(decoded));
      }
      return decoded;
    } catch (error) {
      console.error('Decoding error:', error);
      throw new Error('Failed to decode ECNO');
    }
  }, []);

  // Enhanced location data update function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateLocationData = useCallback(async (locationData: any): Promise<boolean> => {
    try {
      if (!urlParams.encodedEcno) {
        throw new Error('ECNO is missing');
      }
  
      const decodedEcno = decodeMultipleTimes(urlParams.encodedEcno, 5);
      console.log('Decoded ecno:', decodedEcno);     
      
      const payload = {
        ecno: decodedEcno,
        location_name: locationData.locationName,
        referenceCode: urlParams.referenceCode,
      };
  
      const response = await axios.post(`${CHIT_API}/store-location`, payload);
      
      if (response.status === 200) {
        addNotification('Location updated successfully', 'success');
        setLocationState(prev => ({
          ...prev,
          showSuccess: true,
          data: locationData
        }));
        setIsFormDisabled(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating location:', error);
      addNotification('Failed to update location data', 'error');
      setLocationState(prev => ({
        ...prev,
        showError: true
      }));
      setIsFormDisabled(true);
      return false;
    }
  }, [urlParams.encodedEcno, urlParams.referenceCode, decodeMultipleTimes]);
  

  // Improved location and IP fetching
  const getLocationAndIP = useCallback(async (latitude: number, longitude: number) => {
    try {
      const [locationResponse, ipResponse] = await Promise.all([
        axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
        ),
        axios.get('https://api.ipify.org?format=json')
      ]);

      const address = locationResponse.data.address;
      let locationString = '';

      if (address.suburb) locationString += address.suburb;
      if (address.city_district) locationString += (locationString ? ', ' : '') + address.city_district;
      if (address.city) locationString += (locationString ? ', ' : '') + address.city;

      const locationData = {
        locationName: locationString || 'Unknown Location',
        ip: ipResponse.data.ip
      };

      await updateLocationData(locationData);
      return locationData;

    } catch (error) {
      console.error('Error getting location:', error);
      setLocationState(prev => ({
        ...prev,
        isLoading: false,
        showError: true
      }));
      setIsFormDisabled(true);
      addNotification('Failed to get location information', 'error');
      return null;
    }
  }, [updateLocationData]);

  // Enhanced location effect
  useEffect(() => {
    if (coords && isGeolocationEnabled) {
      getLocationAndIP(coords.latitude, coords.longitude);
    }
  }, [coords, isGeolocationEnabled, getLocationAndIP]);

  // Separate effect for validation state updates
  useEffect(() => {
    const isValid = validateStep();
    if (isStepValid !== isValid) {
      setIsStepValid(isValid);
    }
  }, [validateStep, isStepValid]);

  // Modified loadPersistedData effect
  useEffect(() => {
    const loadPersistedData = () => {
      const storedData = getCookieData();

      if (storedData) {
        const { data, timestamp, formState } = storedData;
        const now = Date.now();

        if (now - timestamp < EXPIRATION_TIME) {
          dispatch(setFormData(data));
          setStep(formState.currentStep);
          setOtpVerified(formState.otpVerified);
          setSubmissionTimestamp(formState.submissionTimestamp);

          if (formState.submissionTimestamp && !formState.otpVerified) {
            setShowOtpPopup(true);
            const elapsed = Math.floor(
              (now - formState.submissionTimestamp) / 1000
            );
            const remainingTime = Math.max(0, 60 - elapsed);
            setTimer(remainingTime);
          }

          setShowQrPopup(formState.formSubmitted && formState.otpVerified);
        } else {
          clearCookieData();
        }
      }

      setIsLoading(false);
    };

    loadPersistedData();
  }, [dispatch]);

  // Persist form data effect
  useEffect(() => {
    if (!isLoading) {
      const formState = {
        currentStep: step,
        formSubmitted: showQrPopup,
        otpSent: showOtpPopup,
        otpVerified: otpVerified,
        submissionTimestamp: submissionTimestamp,
      };

      const dataToStore = {
        data: formData,
        timestamp: Date.now(),
        formState,
      };

      setCookieData(dataToStore);
    }
  }, [
    formData,
    step,
    showOtpPopup,
    showQrPopup,
    otpVerified,
    submissionTimestamp,
    isLoading,
  ]);

  useEffect(() => {
    if (showOtpPopup && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [showOtpPopup]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showOtpPopup && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpPopup, timer]);

  useEffect(() => {
    if (otp.length === 6) {
      verifyOtp();
    }
  });

  const addNotification = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

//   const decodeMultipleTimes = (encodedText: string, times: number): string => {
//     let decoded = encodedText;
//     try {
//         for (let i = 0; i < times; i++) {
//             // Using decodeURIComponent to properly handle encoded characters
//             decoded = decodeURIComponent(atob(decoded));
//         }
//         return decoded;
//     } catch (error) {
//         console.error('Decoding error:', error);
//         throw new Error('Failed to decode ECNO');
//     }
// };
  
  // Updated handleSubmit function
  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!locationState.data) {
      addNotification('Location data is required. Please enable location services.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const locationUpdateSuccess = await updateLocationData(locationState.data);
      if (!locationUpdateSuccess) {
        throw new Error('Failed to store location data');
      }
      const decodedEcno = decodeMultipleTimes(urlParams.encodedEcno ?? "", 5);
      
      const submitData = {
        ...formData,
        status: 'P',
        ecno: decodedEcno,
        referenceCode: urlParams.referenceCode,
        location_name: locationState.data.locationName,
        ip_address: locationState.data.ip
      };

      // Rest of your existing validation logic
      if (!submitData.customerTitle || 
        !submitData.customerName || 
        !submitData.mobileNo || 
        !submitData.email || 
        !submitData.CustomerType || 
        !submitData.doorNo || 
        !submitData.street || 
        !submitData.pinCode || 
        !submitData.ecno || 
        !submitData.referenceCode) {
      throw new Error('Required fields are missing');
    }

      
      const response = await axios.post(`${CHIT_API}/customer`, submitData, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 200) {
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        
        addNotification('Form submitted successfully', 'success');
        setShowOtpPopup(true);
        setTimer(60);
        setSubmissionTimestamp(Date.now());
        
        const currentState = {
          currentStep: step,
          formSubmitted: true,
          otpSent: true,
          otpVerified: false,
          submissionTimestamp: Date.now(),
        };

        setCookieData({
          data: formData,
          timestamp: Date.now(),
          formState: currentState,
        });
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      let errorMessage = 'An unknown error occurred';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      addNotification(`Error: ${errorMessage}`, 'error');
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendOtp = async () => {
    if (isResending) return;

    setIsResending(true);
    try {
      await axios.get(`${CHIT_API}/resend/${formData.mobileNo}`);
      addNotification('OTP resent successfully', 'success');
      setTimer(60);
      otpInputRef.current?.focus();
    } catch (error) {
      console.error('Error resending OTP:', error);
      addNotification('Failed to resend OTP', 'error');
    } finally {
      setIsResending(false);
    }
  };

  const generateQrCode = useCallback((mobileNo: string) => {
    setQrCodeData(`${mobileNo}`);
    setShowQrPopup(true);
    return (
      <SecureQRGenerator
        mobileNo={mobileNo}
        onError={(error: string) => addNotification(error, 'error')}
      />
    );
  }, []); // Add dependencies if needed

  const verifyOtp = useCallback(async () => {
    if (isVerifying || !otp) return;

    setIsVerifying(true);
    try {
      const response = await axios.post(
        `${CHIT_API}/verify_otp`,
        {
          OTP: otp,
          mobileNo: formData.mobileNo,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success || response.data.exists) {
        setShowOtpPopup(false);
        setOtpVerified(true);

        clearCookieData();
        Object.keys(Cookies.get()).forEach((cookieName) => {
          Cookies.remove(cookieName);
        });
        localStorage.clear();

        if (response.data.token) {
          localStorage.setItem('authToken', response.data.token);
        }

        dispatch(
          setFormData({
            customerTitle: '',
            customerName: '',
            mobileNo: '',
            CustomerType: '',
            doorNo: '',
            street: '',
            pinCode: '',
            taluk: '',
            purchase_with_sktm: 'No',
            purchase_with_tcs: 'No',
            scm_garments: 'No',
            chit_with_sktm: 'No',
          })
        );

        setStep(1);
        setIsStepValid(false);
        setOtp('');

        addNotification('OTP verified successfully', 'success');
        generateQrCode(response.data.mobileNo || formData.mobileNo);

        setTimeout(() => {
          setShowQrPopup(false);
        }, 1200000);
      } else {
        throw new Error('Invalid OTP');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      let errorMessage = 'Failed to verify OTP';

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      console.error('Error verifying OTP:', error);
      addNotification(errorMessage, 'error');
      setOtp('');
      otpInputRef.current?.focus();
    } finally {
      setIsVerifying(false);
    }
  }, [otp, formData.mobileNo, isVerifying, dispatch, generateQrCode]);

  const resetAllData = () => {
    // Clear all cookies
    Object.keys(Cookies.get()).forEach((cookieName) => {
      Cookies.remove(cookieName);
    });

    // Clear localStorage
    localStorage.clear();

    // Reload the page
    window.location.reload();
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Step1
            validateStep={validateStep}
            setMobileExists={setMobileExists}
            setPendingStatus={setIsPendingStatus}
          />
        );
      case 2:
        return <Step2 validateStep={validateStep} />;
      case 3:
        return <Step3 />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center min-h-screen bg-gradient-to-br from-blue-100 to-purple-100">
      <WifiStatus />
      <div className="flex-1 h-full max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <LeftBanner />
          <div className="flex items-center justify-center p-6 sm:p-12 md:w-1/2">
            <div className="w-full">
              <div className="flex justify-center items-center">
                <h3 className="mb-4 text-xl font-bold text-blue-900">
                  Customer Connect
                </h3>
              </div>
              {/* Progress bar */}
              <div className="relative mb-8">
                <div className="w-full h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 bg-blue-600 rounded-full transition-all duration-500 ease-in-out"
                    style={{ width: `${((step - 1) / 2) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  {['Profile', 'Address', 'Confirm'].map((label, index) => (
                    <span
                      key={label}
                      className={`text-xs font-semibold ${
                        step >= index + 1 ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Form content */}
              <div className="space-y-4">
                <div className="min-h-[400px]">{renderStep()}</div>

                {/* Navigation buttons */}
                <div className="flex justify-between mt-6 space-x-4">
    {step > 1 && (
      <button
        type="button"
        onClick={() => setStep((prev) => prev - 1)}
        className="px-8 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2 inline" />
        Previous
      </button>
    )}

    <div className="flex-1"></div>

    {step < 3 ? (
      <button
        type="button"
        onClick={() => setStep((prev) => prev + 1)}
        // Modified disabled condition here
        disabled={!isStepValid}
        className={`icon flex justify-between items-center px-12 py-2 text-white rounded-lg transition-colors ${
          isStepValid
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        Next
        <ArrowRight className="w-5 h-5 ml-3" />
      </button>
    ) : (
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || !isStepValid}
        className={`flex items-end px-10 py-2 text-white rounded-lg transition-colors ${
          isStepValid && !isSubmitting
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    )}
  </div>
              </div>
              {/* Notifications */}
              <AnimatePresence>
                {notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 50, scale: 0.3 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: 0.5,
                      transition: { duration: 0.2 },
                    }}
                    className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
                      notification.type === 'success'
                        ? 'bg-green-500'
                        : 'bg-red-500'
                    } text-white`}
                  >
                    {notification.message}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* OTP Popup */}
              <AnimatePresence>
                {showOtpPopup && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, rotateX: -90 }}
                      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                      exit={{ opacity: 0, scale: 0.5, rotateX: 90 }}
                      transition={{ type: 'spring', damping: 15 }}
                      className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md mx-4"
                      style={{ WebkitTransform: 'translateZ(0)' }}
                    >
                      <h4 className="text-2xl font-bold mb-4 text-blue-600">
                        Enter OTP
                      </h4>
                      <p className="mb-4 text-gray-600">
                        An OTP has been sent to:{' '}
                        <span className="font-semibold">
                          {formData.mobileNo}
                        </span>
                      </p>
                      <div className="flex items-center justify-center mb-4">
                        <Clock className="text-blue-500 mr-2" />
                        <span className="text-lg font-semibold text-blue-600">
                          {timer}s
                        </span>
                      </div>
                      <input
                        ref={otpInputRef}
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, ''))
                        }
                        className="border-2 border-blue-300 rounded-lg px-4 py-2 mb-4 w-full text-center text-2xl tracking-widest focus:outline-none focus:border-blue-500 transition-colors"
                        maxLength={6}
                        placeholder="• • • • • •"
                        style={{ fontSize: '24px' }}
                      />
                      <div className="flex space-x-4">
                        <button
                          onClick={resetAllData}
                          className="w-full flex items-center justify-center bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reset All
                        </button>
                        <button
                          onClick={resendOtp}
                          disabled={isResending || timer > 0}
                          className="w-full flex items-center justify-center bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400"
                        >
                          <Send className="w-4 h-6 mr-2" />
                          {isResending ? 'Resending...' : 'Resend OTP'}
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* QR Code Popup */}
              <AnimatePresence>
                {showQrPopup && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="bg-white p-8 rounded-lg shadow-2xl text-center relative m-4"
                    >
                      <button
                        onClick={() => setShowQrPopup(false)}
                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                      >
                        <X size={24} />
                      </button>
                      <h4 className="text-xl font-bold mb-4 text-blue-600">
                        Registration Successful
                      </h4>
                      <p className="text-gray-600 mb-4">
                        Thank you for registering with us!
                      </p>
                      <div className="bg-white p-4 inline-block rounded-lg shadow-md">
                        <QRCode value={qrCodeData} size={200} />
                      </div>
                      <p className="mt-4 text-sm text-gray-500">
                        Scan this QR code to access your account
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
