import React, { useEffect, useRef } from 'react';
import { Coordinate, SavedMarker } from '../types.ts';

declare global {
  interface Window {
    L: any;
  }
}

interface MapComponentProps {
  currentLocation: Coordinate | null;
  path: Coordinate[];
  history: Coordinate[][];
  markers: SavedMarker[];
  onMapClick: (lat: number, lng: number) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  currentLocation, 
  path, 
  history, 
  markers,
  onMapClick 
}) => {
  const mapRef = useRef<any>(null);
  const layersRef = useRef<{
      path: any;
      history: any;
      markers: any;
      user: any;
  } | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!window.L || mapRef.current) return;

    // Initialize map
    mapRef.current = window.L.map('map-container', {
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 0,    // Smooth zooming
      zoomDelta: 0.5
    }).setView([0, 0], 2); // Start at 0,0, will fly to user later

    // TILE LAYER: Clean White/Grey streets
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd'
    }).addTo(mapRef.current);

    // Initialize Layer Groups
    layersRef.current = {
        history: window.L.layerGroup().addTo(mapRef.current),
        path: window.L.layerGroup().addTo(mapRef.current),
        markers: window.L.layerGroup().addTo(mapRef.current),
        user: window.L.marker([0,0]).addTo(mapRef.current) // Placeholder
    };

    // Map Click Event
    mapRef.current.on('click', (e: any) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

    // Fix map size on load
    setTimeout(() => mapRef.current.invalidateSize(), 200);

  }, []); 

  // Handle Recenter Event from App.tsx
  useEffect(() => {
      const handleRecenter = () => {
          if(currentLocation && mapRef.current) {
              mapRef.current.flyTo([currentLocation.lat, currentLocation.lng], 18, {
                  animate: true,
                  duration: 1.5
              });
          }
      };
      window.addEventListener('recenter-map', handleRecenter);
      return () => window.removeEventListener('recenter-map', handleRecenter);
  }, [currentLocation]);

  // Update User Location Marker
  useEffect(() => {
    if (!mapRef.current || !currentLocation || !window.L || !layersRef.current) return;
    
    const { lat, lng } = currentLocation;

    // Custom Blue Pulse Icon
    const userIcon = window.L.divIcon({
        className: 'custom-user-icon',
        html: `
          <div style="position: relative; width: 24px; height: 24px;">
             <div style="position: absolute; inset: 0; background: #3B82F6; border-radius: 50%; opacity: 0.5; animation: ping 1.5s infinite;"></div>
             <div style="position: absolute; inset: 6px; background: #2563EB; border: 2px solid white; border-radius: 50%;"></div>
          </div>
          <style>@keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }</style>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    layersRef.current.user.setLatLng([lat, lng]);
    layersRef.current.user.setIcon(userIcon);
    layersRef.current.user.setOpacity(1);

    // If this is the very first fix (zoom is low), fly to user
    if (mapRef.current.getZoom() < 5) {
        mapRef.current.setView([lat, lng], 18);
    }
  }, [currentLocation]);

  // Render History (Yellow)
  useEffect(() => {
    if (!layersRef.current || !window.L) return;
    layersRef.current.history.clearLayers();

    history.forEach(histPath => {
      if (histPath.length < 2) return;
      window.L.polyline(histPath.map(p => [p.lat, p.lng]), { 
        color: '#EAB308', // Yellow
        weight: 6, 
        opacity: 0.7,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layersRef.current.history);
    });
  }, [history]);

  // Render Current Path (Green)
  useEffect(() => {
    if (!layersRef.current || !window.L) return;
    layersRef.current.path.clearLayers();

    if (path.length > 1) {
      const latlngs = path.map(p => [p.lat, p.lng]);
      
      // Draw Outer Green Glow
      window.L.polyline(latlngs, {
        color: '#166534', // Dark Green
        weight: 10,
        opacity: 0.2
      }).addTo(layersRef.current.path);

      // Draw Inner Bright Green
      window.L.polyline(latlngs, { 
        color: '#22C55E', // Bright Green
        weight: 5, 
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(layersRef.current.path);
    }
  }, [path]);

  // Render Markers
  useEffect(() => {
    if (!layersRef.current || !window.L) return;
    layersRef.current.markers.clearLayers();

    markers.forEach(marker => {
      let color = '#EF4444'; 
      let label = '📍';
      
      if (marker.type === 'house') { color = '#10B981'; label = '🏠'; } // Greenish for house
      if (marker.type === 'shop') { color = '#F59E0B'; label = '🛒'; }  // Orange for shop

      const markerHtml = `
        <div style="
          background-color: ${color};
          width: 36px; height: 36px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 3px 6px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
        ">
          <div style="transform: rotate(45deg); font-size: 16px;">${label}</div>
        </div>
      `;

      const icon = window.L.divIcon({
        className: '',
        html: markerHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      });

      window.L.marker([marker.lat, marker.lng], { icon })
        .bindPopup(`
            <div style="font-family: sans-serif;">
                <strong style="color:${color}">${marker.type.toUpperCase()}</strong>
                <p style="margin:4px 0 0 0">${marker.note}</p>
            </div>
        `)
        .addTo(layersRef.current.markers);
    });
  }, [markers]);

  return (
    <div 
        id="map-container" 
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
    />
  );
};

export default MapComponent;
