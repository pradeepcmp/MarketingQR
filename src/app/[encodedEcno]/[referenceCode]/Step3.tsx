"use client";

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store/store';
import { setEditField } from './store/formSlice';
import { Pencil, Save } from 'lucide-react';

interface FieldProps {
  label: string;
  value: string | number | undefined;
  field: string;
  type?: string;
}

const Step3: React.FC = () => {
  const formData = useSelector((state: RootState) => state.form);
  const dispatch = useDispatch();

  const Field: React.FC<FieldProps> = ({ label, value, field, type }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [fieldValue, setFieldValue] = useState(value);
    const [error, setError] = useState<string>('');

    const handleEditClick = () => {
      setIsEditing(true);
      setError('');
    };

    const validateMobileNumber = (value: string | number | undefined): boolean => {
      if (typeof value === 'string') {
        const mobileRegex = /^\d{10}$/;
        return mobileRegex.test(value);
      }
      return false;
    };

    const handleSaveClick = () => {
      if (field === 'mobileNo') {
        if (!validateMobileNumber(fieldValue)) {
          setError('Mobile number must be exactly 10 digits');
          return;
        }
      }
      dispatch(setEditField({ field, value: fieldValue }));
      setIsEditing(false);
      setError('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (field === 'mobileNo') {
        // Only allow digits and limit to 10 characters
        const sanitizedValue = newValue.replace(/\D/g, '').slice(0, 10);
        setFieldValue(sanitizedValue);
        if (sanitizedValue.length === 10) {
          setError('');
        } else {
          setError('Mobile number must be exactly 10 digits');
        }
      } else {
        setFieldValue(newValue);
      }
    };

    return (
      <div className="flex flex-col mb-4">
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <span className="font-bold text-sm lg:text-base">{label}:</span>
            {isEditing ? (
              <input
                type={type || "text"}
                value={fieldValue}
                onChange={handleInputChange}
                className={`border rounded p-1 ml-2 text-sm lg:text-base w-full ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                inputMode={field === 'mobileNo' ? 'numeric' : 'text'}
              />
            ) : (
              <span className="text-sm lg:text-base ml-2">{value || 'Not provided'}</span>
            )}
          </div>
          {isEditing ? (
            <button
              onClick={handleSaveClick}
              className="text-green-500 hover:text-green-700 text-sm ml-3 mt-6"
              disabled={field === 'mobileNo' && !!error}
            >
              <Save size={24} />
            </button>
          ) : (
            <button
              onClick={handleEditClick}
              className="text-blue-500 hover:text-blue-700 ml-2"
            >
              <Pencil size={16} />
            </button>
          )}
        </div>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    );
  };

  return (
    <div className="max-w-md w-full p-6 mx-auto">
      <p className="text-lg text-center font-bold mb-6 text-blue-800">
        Please Review Your Information Before Submitting.
      </p>
      <div className="space-y-3">
        <Field label="Customer Name" value={formData.customerName} field="customerName" />
        <Field 
          label="Mobile No" 
          value={formData.mobileNo} 
          field="mobileNo" 
          type="tel" 
        />
        <Field label="Email" value={formData.email} field="email" type="email" />
        <Field label="Address" value={formData.doorNo} field="doorNo" />
        <Field label="Street" value={formData.street} field="street" />
        <Field label="Area" value={formData.area} field="area" />
        <Field label="Taluk" value={formData.taluk} field="taluk" />
        <Field label="City" value={formData.city} field="city" />
        <Field label="State" value={formData.state} field="state" />
      </div>
    </div>
  );
};

export default Step3;