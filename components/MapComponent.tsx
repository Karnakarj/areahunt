import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L, { type LatLng } from 'leaflet';
import type { MarkerData } from '../types.ts';
import { UserLocationIcon } from './Icons.tsx';

// Custom icon for user's current location
const userLocationIcon = L.divIcon({
  html: `<div class="relative flex h-5 w-5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-5 w-5 bg-blue-500 border-2 border-white"></span>
         </div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Custom icon for saved markers
const savedMarkerIcon = L.divIcon({
    html: `<div class="text-red-500">${UserLocationIcon}</div>`,
    className: '',
    iconSize: [24, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});


interface MapComponentProps {
  currentPosition: LatLng;
  path: LatLng[];
  markers: MarkerData[];
  center: LatLng | null;
}

// A helper component to programmatically control the map's view
const MapController = ({ center }: { center: LatLng | null }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, map.getZoom() < 16 ? 16 : map.getZoom(), {
                animate: true,
                duration: 1.5
            });
        }
    }, [center, map]);
    return null;
}

const MapComponent: React.FC<MapComponentProps> = ({ currentPosition, path, markers, center }) => {
  return (
    <MapContainer center={currentPosition} zoom={16} scrollWheelZoom={true}>
      <MapController center={center} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Draw the user's traveled path */}
      <Polyline pathOptions={{ color: 'blue', weight: 5, opacity: 0.7 }} positions={path} />

      {/* Display user-placed markers */}
      {markers.map(marker => (
        <Marker key={marker.id} position={marker.position} icon={savedMarkerIcon}>
          <Popup>
            Marker placed at {marker.timestamp}
          </Popup>
        </Marker>
      ))}

      {/* Display the user's current location */}
      <Marker position={currentPosition} icon={userLocationIcon}>
        <Popup>You are here</Popup>
      </Marker>
    </MapContainer>
  );
};

export default MapComponent;
