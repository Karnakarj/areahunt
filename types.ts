import type { LatLng } from 'leaflet';

export interface MarkerData {
  id: number;
  position: LatLng;
  timestamp: string;
}
