import React from 'react';

export const TargetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15a5 5 0 100-10 5 5 0 000 10z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12V7m0 10v-5m-5 5h10M7 12H2m15 0h-5" />
  </svg>
);

export const MarkerPinIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

export const UserLocationIcon = (
    <svg viewBox="0 0 24 41" fill="currentColor" height="41" width="24">
        <path d="M12 0C7.3 0 3.5 3.8 3.5 8.5c0 8.7 8.5 21.2 8.5 21.2s8.5-12.5 8.5-21.2C20.5 3.8 16.7 0 12 0zm0 12.5c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" />
    </svg>
);
