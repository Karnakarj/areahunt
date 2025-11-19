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
  const pathLayerRef = useRef<any>(null);
  const historyLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const isMapInitialized = useRef(false);

  // Initialize Map
  useEffect(() => {
    if (!window.L || isMapInitialized.current) return;

    // Default view: New York (will be updated by GPS)
    const initialLat = 40.7128;
    const initialLng = -74.0060;

    mapRef.current = window.L.map('map-container', {
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 0.1
    }).setView([initialLat, initialLng], 13);

    // TILE LAYER: White/Light streets as requested (CartoDB Voyager)
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 20
    }).addTo(mapRef.current);

    // Click handler for adding markers
    mapRef.current.on('click', (e: any) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

    // Create Layer Groups
    historyLayerRef.current = window.L.layerGroup().addTo(mapRef.current);
    pathLayerRef.current = window.L.layerGroup().addTo(mapRef.current);
    markersLayerRef.current = window.L.layerGroup().addTo(mapRef.current);

    isMapInitialized.current = true;

    // Force map resize to ensure it fills the container
    setTimeout(() => {
        mapRef.current.invalidateSize();
    }, 500);
  }, []); // Empty dependency array = runs once on mount

  // Update User Location Marker & Pan Map
  useEffect(() => {
    if (!mapRef.current || !currentLocation || !window.L) return;
    
    const { lat, lng } = currentLocation;

    if (!userMarkerRef.current) {
      // Create the pulsing blue dot for user
      const userIcon = window.L.divIcon({
        className: 'custom-user-icon',
        html: `
          <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
             <div style="position: absolute; width: 100%; height: 100%; background-color: #3B82F6; border-radius: 50%; opacity: 0.75; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
             <div style="position: relative; width: 12px; height: 12px; background-color: #2563EB; border: 2px solid white; border-radius: 50%;"></div>
          </div>
          <style>
            @keyframes ping {
              75%, 100% { transform: scale(2); opacity: 0; }
            }
          </style>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      userMarkerRef.current = window.L.marker([lat, lng], { icon: userIcon }).addTo(mapRef.current);
      
      // Zoom to user immediately on first fix
      mapRef.current.setView([lat, lng], 18);
    } else {
      userMarkerRef.current.setLatLng([lat, lng]);
    }
  }, [currentLocation]);

  // Draw History (Yellow) and Current Path (Green)
  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    // 1. History Paths (Yellow)
    historyLayerRef.current.clearLayers();
    history.forEach(histPath => {
      if (histPath.length < 2) return;
      const latlngs = histPath.map(p => [p.lat, p.lng]);
      
      window.L.polyline(latlngs, { 
        color: '#EAB308', // Yellow-500
        weight: 6, 
        opacity: 0.6,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(historyLayerRef.current);
    });

    // 2. Current Path (Green)
    pathLayerRef.current.clearLayers();
    if (path.length > 1) {
      const latlngs = path.map(p => [p.lat, p.lng]);
      
      // Outer darker green for contrast
      window.L.polyline(latlngs, {
        color: '#14532d', 
        weight: 8,
        opacity: 0.3
      }).addTo(pathLayerRef.current);

      // Inner bright green
      window.L.polyline(latlngs, { 
        color: '#22C55E', // Green-500
        weight: 4, 
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(pathLayerRef.current);
    }
  }, [path, history]);

  // Draw Saved Markers
  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    markersLayerRef.current.clearLayers();

    markers.forEach(marker => {
      let color = '#EF4444'; 
      let label = '?';
      
      if (marker.type === 'house') { color = '#10B981'; label = '🏠'; }
      if (marker.type === 'shop') { color = '#F59E0B'; label = '🛒'; }
      if (marker.type === 'note') { color = '#6366F1'; label = '📝'; }

      const markerHtml = `
        <div style="
          background-color: ${color};
          width: 32px; height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
        ">
          <div style="transform: rotate(45deg); font-size: 14px; line-height: 1;">${label}</div>
        </div>
      `;

      const icon = window.L.divIcon({
        className: '',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      window.L.marker([marker.lat, marker.lng], { icon })
        .bindPopup(`<b>${marker.type.toUpperCase()}</b><br/>${marker.note}`)
        .addTo(markersLayerRef.current);
    });
  }, [markers]);

  // Listener for "Recenter" event
  useEffect(() => {
    const handleRecenter = () => {
      if (currentLocation && mapRef.current) {
        mapRef.current.flyTo([currentLocation.lat, currentLocation.lng], 18);
      }
    };
    window.addEventListener('recenter-map', handleRecenter);
    return () => window.removeEventListener('recenter-map', handleRecenter);
  }, [currentLocation]);

  return (
    <div 
        id="map-container" 
        style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            zIndex: 0,
            background: '#e5e7eb' 
        }}
    />
  );
};

export default MapComponent;
