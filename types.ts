export interface Coordinate {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface SavedMarker {
  id: string;
  lat: number;
  lng: number;
  note: string;
  type: 'house' | 'shop' | 'note';
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  groundingUrls?: { uri: string; title: string }[];
}
