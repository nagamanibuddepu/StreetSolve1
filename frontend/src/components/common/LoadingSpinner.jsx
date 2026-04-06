import React from 'react';
export default function LoadingSpinner({ size = 'md', color = 'saffron' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`${sizes[size]} border-2 border-gray-200 border-t-saffron rounded-full animate-spin`} />
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-cream">
      <div className="text-4xl animate-float">🏛️</div>
      <div className="w-8 h-8 border-3 border-gray-200 border-t-saffron rounded-full animate-spin" />
      <p className="text-sm text-gray-400 font-medium">Loading StreetSolve...</p>
    </div>
  );
}
