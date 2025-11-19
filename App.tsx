import React, { useState, useEffect, useCallback } from 'react';
import type { LatLng } from 'leaflet';
import { useGeolocation } from './hooks/useGeolocation.ts';
import MapComponent from './components/MapComponent.tsx';
import { MarkerData } from './types.ts';
import { TargetIcon, MarkerPinIcon } from './components/Icons.tsx';

const MIN_DISTANCE_METERS = 10; // The minimum distance the user has to move to record a new path point.

export default function App() {
  const { position, error } = useGeolocation();
  const [path, setPath] = useState<LatLng[]>([]);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);

  useEffect(() => {
    if (position) {
      // Set initial map center
      if (!mapCenter) {
        setMapCenter(position);
      }

      // Add position to path if moved far enough
      setPath(prevPath => {
        if (prevPath.length === 0 || position.distanceTo(prevPath[prevPath.length - 1]) > MIN_DISTANCE_METERS) {
          return [...prevPath, position];
        }
        return prevPath;
      });
    }
  }, [position, mapCenter]);

  const handleAddMarker = useCallback(() => {
    if (position) {
      const newMarker: MarkerData = {
        id: Date.now(),
        position: position,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMarkers(prevMarkers => [...prevMarkers, newMarker]);
    }
  }, [position]);

  const handleCenterMap = useCallback(() => {
    if (position) {
      setMapCenter(position);
    }
  }, [position]);

  const renderContent = () => {
    if (error) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-100 text-center p-4">
          <div>
            <h2 className="text-xl font-bold text-red-600 mb-2">Location Error</h2>
            <p className="text-gray-700">{error}</p>
            <p className="text-gray-500 mt-2">Please enable location services in your browser or device settings and refresh the page.</p>
          </div>
        </div>
      );
    }

    if (!position) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-800 text-white">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Acquiring your location...</p>
            <p className="text-sm text-gray-400 mt-2">Please grant location permissions if prompted.</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="relative h-screen w-screen">
        <MapComponent 
            currentPosition={position} 
            path={path} 
            markers={markers}
            center={mapCenter}
        />
        <div className="absolute bottom-6 right-6 z-[1000] flex flex-col space-y-4">
            <button
                onClick={handleCenterMap}
                className="bg-white rounded-full p-4 shadow-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition"
                aria-label="Center map on your location"
            >
                <TargetIcon />
            </button>
            <button
                onClick={handleAddMarker}
                className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition"
                aria-label="Add marker at current location"
            >
                <MarkerPinIcon />
            </button>
        </div>
      </div>
    );
  };

  return <main>{renderContent()}</main>;
}
