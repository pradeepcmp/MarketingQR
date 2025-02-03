import React, { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store/store';
import { updateField } from './store/formSlice';
import { FormData } from './types';

interface Step1Props {
  validateStep: () => boolean;
  setMobileExists: (exists: boolean) => void;
  setPendingStatus: (isPending: boolean) => void;
}


const Step1: React.FC<Step1Props> = ({ validateStep, setMobileExists, setPendingStatus  }) => {
  const formData = useSelector((state: RootState) => state.form);
  const dispatch = useDispatch();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isCheckingMobile, setIsCheckingMobile] = useState(false);
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Refs for focusing error fields
  const refs = {
    customerTitle: useRef<HTMLSelectElement>(null),
    customerName: useRef<HTMLInputElement>(null),
    mobileNo: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    CustomerType: useRef<HTMLSelectElement>(null),
  };
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validateField = (field: keyof FormData, value: any) => {
    try {
      switch (field) {
        case 'customerTitle':
          if (!value) throw new Error('Title is required');
          break;
        case 'customerName':
          if (!value.trim()) throw new Error('Customer name is required');
          if (value.length < 2) throw new Error('Name must be at least 2 characters');
          break;
        case 'mobileNo':
          if (!value) throw new Error('Mobile number is required');
          if (!/^\d{10}$/.test(value)) throw new Error('Mobile number must be 10 digits');
          break;
        case 'email':
          if (!value) throw new Error('Email ID is required');
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            throw new Error('Invalid email format');
          }
          break;
        case 'CustomerType':
          if (!value) throw new Error('Customer type is required');
          break;
      }
      return '';
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid input';
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInputChange = (field: keyof FormData, value: any) => {
    dispatch(updateField({ field, value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  React.useEffect(() => {
    validateStep();
  }, [formData, validateStep]);

  const validateMobileNo = async (mobileNo: string) => {
    if (mobileNo.length !== 10) {
      // Set mobileExists to false if length is not 10
      setMobileExists(false);
      setErrors(prev => ({ ...prev, mobileNo: 'Mobile number must be 10 digits.' }));
      return;
    }

    setIsCheckingMobile(true);

    try {
      const response = await fetch(`https://cust.spacetextiles.net/check_users/${mobileNo}`);
      const data = await response.json();

      if (data.exists) {
        const isPending = data.status === 'P';
        const error = data.status === 'V'
          ? 'This mobile number is already registered and verified.'
          : 'This mobile number is pending verification.';

        setErrors(prev => ({ ...prev, mobileNo: error }));
        setMobileExists(!isPending); // Only set as exists if not pending
        setPendingStatus(isPending); // Set pending status
      } else {
        setMobileExists(false);
        setPendingStatus(false);
      }
    } catch {
      setErrors(prev => ({
        ...prev,
        mobileNo: 'Error checking mobile number. Please try again.'
      }));
      setMobileExists(false);
      setPendingStatus(false);
    }

    setIsCheckingMobile(false);
  };


  React.useEffect(() => {
    if (formData.CustomerType === 'ExistingCustomer') {
      const checkboxFields = [
        'purchase_with_sktm',
        'purchase_with_tcs',
        'scm_carments',
        'chit_with_sktm'
      ];

      checkboxFields.forEach(field => {
        if (!formData[field]) {
          dispatch(updateField({ field, value: 'No' }));
        }
      });
    }
  }, [formData.CustomerType, dispatch, formData]);

  // Handle individual checkbox changes
  const handleCheckboxChange = (field: keyof FormData) => {
    const newValue = formData[field] === 'Yes' ? 'No' : 'Yes';
    dispatch(updateField({ field, value: newValue }));
  };


  const getInputClassName = (field: keyof FormData) => {
    const hasError = touched[field] && errors[field];
    return `h-10 border mt-1 rounded px-4 w-full bg-gray-50 ${
      hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
      : 'border-gray-300'
    }`;
  };

  return (
    <div className="grid gap-4 gap-y-2 text-sm grid-cols-1 md:grid-cols-2">
      <div className="md:col-span-2">
        <label htmlFor="customerName" className="block text-left after:content-['*'] after:ml-0.5 after:text-red-500 text-sm font-bold text-slate-700">
          Customer Name
        </label>
        <div className="flex">
          <select
            ref={refs.customerTitle}
            className={`h-10 border mt-1 rounded-l px-2 bg-gray-50 ${
              touched.customerTitle && errors.customerTitle ? 'border-red-500' : 'border-gray-300'
            }`}
            style={{ width: '60px' }}
            value={formData.customerTitle}
            onChange={(e) => handleInputChange('customerTitle', e.target.value)}
            onBlur={() => handleBlur('customerTitle')}
          >
            <option value=""></option>
            <option value="Mr.">Mr.</option>
            <option value="Ms.">Ms.</option>
            <option value="Mrs.">Mrs.</option>
          </select>
          <input
            ref={refs.customerName}
            type="text"
            value={formData.customerName}
            onChange={(e) => handleInputChange('customerName', e.target.value)}
            onBlur={() => handleBlur('customerName')}
            className={`${getInputClassName('customerName')} rounded-l-none`}
          />
        </div>
        {touched.customerTitle && errors.customerTitle && (
          <p className="text-red-500 text-xs mt-1">{errors.customerTitle}</p>
        )}
        {touched.customerName && errors.customerName && (
          <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>
        )}
      </div>

      <div className="md:col-span-1">
        <label htmlFor="mobileNo" className="block text-left after:content-['*'] after:ml-0.5 after:text-red-500 text-sm font-bold text-slate-700">
          Mobile Number
        </label>
        <input
          ref={refs.mobileNo}
          type="text"
          value={formData.mobileNo}
          onChange={(e) => {
            handleInputChange('mobileNo', e.target.value);
            validateMobileNo(e.target.value);
          }}
          onBlur={() => handleBlur('mobileNo')}
          className={getInputClassName('mobileNo')}
          maxLength={10}
        />
        {isCheckingMobile && (
          <p className="text-blue-500 text-xs mt-1">Checking mobile number...</p>
        )}
        {touched.mobileNo && errors.mobileNo && (
          <p className="text-red-500 text-xs mt-1">{errors.mobileNo}</p>
        )}
      </div>

      <div className="md:col-span-1">
        <label htmlFor="dateOfBirth" className="block text-left text-sm font-bold text-slate-700">
          Date Of Birth
        </label>
        <input
          type="date"
          value={formData.dateOfBirth || ''}
          max={today}
          onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
          className="h-10 border mt-1 rounded px-4 w-full bg-gray-50"
        />
      </div>

      <div className="md:col-span-2">
        <label htmlFor="email" className="block text-left after:content-['*'] after:ml-0.5 after:text-red-500 text-sm font-bold text-slate-700">
          Email
        </label>
        <input
          ref={refs.email}
          type="email"
          value={formData.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          className={getInputClassName('email')}
        />
        {touched.email && errors.email && (
          <p className="text-red-500 text-xs mt-1">{errors.email}</p>
        )}
      </div>

      <div className="md:col-span-2">
        <label htmlFor="professional" className="block text-left text-sm font-bold text-slate-700">
          Professional
        </label>
        <select
          value={formData.professional || ''}
          onChange={(e) => handleInputChange('professional', e.target.value)}
          className="h-10 border mt-1 rounded px-4 w-full bg-gray-50"
        >
          <option value="">Select Professional Type</option>
          <option value="Architects">Architects</option>
          <option value="Govt Employee">Govt Employee</option>
          <option value="Private Employee">Private Employee</option>
          <option value="Marketing careers">Marketing careers</option>
          <option value="Doctor">Doctor</option>
          <option value="Engineer">Engineer</option>
          <option value="Lawyer">Lawyer</option>
          <option value="Business">Business</option>
          <option value="Agriculture">Agriculture</option>
          <option value="Accountant">Accountant</option>
          <option value="Others">Others</option>
        </select>
      </div>

      <div className="md:col-span-2">
        <label htmlFor="CustomerType" className="block text-left after:content-['*'] after:ml-0.5 after:text-red-500 text-sm font-bold text-slate-700">
          Customer Type
        </label>
        <select
          ref={refs.CustomerType}
          value={formData.CustomerType}
          onChange={(e) => handleInputChange('CustomerType', e.target.value)}
          onBlur={() => handleBlur('CustomerType')}
          className={getInputClassName('CustomerType')}
        >
          <option value="">Select Customer Type</option>
          <option value="NewCustomer">New Customer</option>
          <option value="ExistingCustomer">Existing Customer</option>
        </select>
        {touched.CustomerType && errors.CustomerType && (
          <p className="text-red-500 text-xs mt-1">{errors.CustomerType}</p>
        )}
      </div>

      {formData.CustomerType === 'ExistingCustomer' && (
        <div className="md:col-span-2">
          <label className="block text-left text-sm font-bold text-slate-700">
            Existing Customer Options
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { field: 'purchase_with_sktm', label: 'Jewellery Purchased' },
              { field: 'purchase_with_tcs', label: 'TCS Silks Purchased' },
              { field: 'scm_garments', label: 'SCM Garments' },
              { field: 'chit_with_sktm', label: 'Scheme Joined' }
            ].map(({ field, label }) => (
              <div key={field} className="flex items-center">
                <input
                  type="checkbox"
                  id={field}
                  checked={formData[field] === 'Yes'}
                  onChange={() => handleCheckboxChange(field as keyof FormData)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={field} className="ml-2 block text-sm text-gray-900">
                  {label}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Step1;