import React from 'react';
import { motion } from 'framer-motion';

const LocationLoadingSpinner = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
      >
        <motion.div
          animate={{
            rotate: 360,
            transition: {
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            },
          }}
          className="inline-block mb-4"
        >
          <svg
            className="w-16 h-16 text-sky-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </motion.div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Getting Your Location
        </h3>
        <p className="text-gray-600">
          Please wait while we detect your location...
        </p>
      </motion.div>
    </motion.div>
  );
};

export default LocationLoadingSpinner;
