'use client';

import MultiStepForm from './connect';
import { useParams } from 'next/navigation';

export default function FormPage() {
  const params = useParams();

  if (!params.encodedEcno || !params.referenceCode) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-purple-100">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid URL</h1>
          <p className="text-gray-600">Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  return <MultiStepForm />;
}
