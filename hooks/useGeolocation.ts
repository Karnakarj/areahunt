import { useState, useEffect } from 'react';
import L, { type LatLng } from 'leaflet';

interface GeolocationState {
  position: LatLng | null;
  error: string | null;
}

export const useGeolocation = (): GeolocationState => {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation is not supported by your browser.' }));
      return;
    }

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setState({
          position: L.latLng(latitude, longitude),
          error: null,
        });
      },
      (err) => {
        let message = 'An unknown error occurred.';
        switch(err.code) {
          case err.PERMISSION_DENIED:
            message = "Location access denied. Please allow location access to use this app.";
            break;
          case err.POSITION_UNAVAILABLE:
            message = "Location information is unavailable.";
            break;
          case err.TIMEOUT:
            message = "The request to get user location timed out.";
            break;
        }
        setState(s => ({ ...s, error: message }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watcher);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
};
