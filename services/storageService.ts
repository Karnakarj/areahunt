import { Coordinate, SavedMarker } from '../types.ts';

const KEYS = {
  CURRENT_PATH: 'areahunt_current_path',
  SAVED_PATHS: 'areahunt_saved_paths',
  MARKERS: 'areahunt_markers',
};

export const StorageService = {
  saveCurrentPath: (path: Coordinate[]) => {
    localStorage.setItem(KEYS.CURRENT_PATH, JSON.stringify(path));
  },

  loadCurrentPath: (): Coordinate[] => {
    const data = localStorage.getItem(KEYS.CURRENT_PATH);
    return data ? JSON.parse(data) : [];
  },

  saveMarkers: (markers: SavedMarker[]) => {
    localStorage.setItem(KEYS.MARKERS, JSON.stringify(markers));
  },

  loadMarkers: (): SavedMarker[] => {
    const data = localStorage.getItem(KEYS.MARKERS);
    return data ? JSON.parse(data) : [];
  },

  // When a session ends, move current path to history
  archiveCurrentPath: () => {
    const current = StorageService.loadCurrentPath();
    if (current.length === 0) return;

    const historyData = localStorage.getItem(KEYS.SAVED_PATHS);
    const history: Coordinate[][] = historyData ? JSON.parse(historyData) : [];
    
    history.push(current);
    localStorage.setItem(KEYS.SAVED_PATHS, JSON.stringify(history));
    localStorage.removeItem(KEYS.CURRENT_PATH);
  },

  loadHistory: (): Coordinate[][] => {
    const data = localStorage.getItem(KEYS.SAVED_PATHS);
    return data ? JSON.parse(data) : [];
  },
  
  clearAll: () => {
      localStorage.removeItem(KEYS.CURRENT_PATH);
      localStorage.removeItem(KEYS.SAVED_PATHS);
      localStorage.removeItem(KEYS.MARKERS);
  }
};
