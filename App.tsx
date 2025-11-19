import React, { useState, useEffect, useRef } from 'react';
import MapComponent from './components/MapComponent.tsx';
import AIAssistant from './components/AIAssistant.tsx';
import { Coordinate, SavedMarker } from './types.ts';
import { StorageService } from './services/storageService.ts';

const App: React.FC = () => {
  // State
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [currentPath, setCurrentPath] = useState<Coordinate[]>([]);
  const [savedPaths, setSavedPaths] = useState<Coordinate[][]>([]);
  const [markers, setMarkers] = useState<SavedMarker[]>([]);
  
  // UI State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [showAddMarkerModal, setShowAddMarkerModal] = useState(false);
  const [tempMarkerLoc, setTempMarkerLoc] = useState<{lat: number, lng: number} | null>(null);
  const [markerNote, setMarkerNote] = useState('');
  const [markerType, setMarkerType] = useState<'house' | 'shop' | 'note'>('note');
  const [showTutorial, setShowTutorial] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  // 1. Load Data on Startup
  useEffect(() => {
    const loadedHistory = StorageService.loadHistory();
    const loadedMarkers = StorageService.loadMarkers();
    const activePath = StorageService.loadCurrentPath();

    setSavedPaths(loadedHistory);
    setMarkers(loadedMarkers);

    if (activePath.length > 0) {
        setCurrentPath(activePath);
        setIsTracking(true); // Auto-resume
        setShowTutorial(false);
    } else if (loadedHistory.length > 0) {
        setShowTutorial(false);
    }
  }, []);

  // 2. PWA Install Handler
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  // 3. Wake Lock (Keep screen on)
  const requestWakeLock = async () => {
      try {
          if ('wakeLock' in navigator) {
              wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          }
      } catch (err) { console.log('Wake Lock error:', err); }
  };

  // 4. Tracking Logic
  const startTracking = () => {
    if (!('geolocation' in navigator)) {
        alert("GPS not supported");
        return;
    }

    setIsTracking(true);
    requestWakeLock();

    const options = { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 };

    watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            const newPoint: Coordinate = { lat: latitude, lng: longitude, timestamp: pos.timestamp };
            
            setCurrentLocation(newPoint);

            // REAL WORLD FILTER: 
            // 1. If accuracy is bad (>30m), ignore.
            // 2. If distance from last point is tiny (< 4m), ignore (jitter).
            if (accuracy > 30) return;

            setCurrentPath(prev => {
                if (prev.length > 0) {
                    const last = prev[prev.length - 1];
                    const dist = Math.sqrt(Math.pow(last.lat - latitude, 2) + Math.pow(last.lng - longitude, 2));
                    if (dist < 0.00004) return prev; // Approx 4-5 meters
                }
                const updated = [...prev, newPoint];
                StorageService.saveCurrentPath(updated);
                return updated;
            });
        },
        (err) => console.error("GPS Error", err),
        options
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
    }
    if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
    }
    
    setIsTracking(false);
    StorageService.archiveCurrentPath();
    
    if (currentPath.length > 1) {
        setSavedPaths(prev => [...prev, currentPath]);
    }
    setCurrentPath([]);
  };

  useEffect(() => {
    if (isTracking && !watchIdRef.current) startTracking();
    else if (!isTracking && watchIdRef.current) stopTracking();
  }, [isTracking]);

  // 5. UI Handlers
  const handleMapClick = (lat: number, lng: number) => {
      setTempMarkerLoc({lat, lng});
      setShowAddMarkerModal(true);
  };

  const saveMarker = () => {
      if (!tempMarkerLoc) return;
      const newMarker: SavedMarker = {
          id: Date.now().toString(),
          lat: tempMarkerLoc.lat,
          lng: tempMarkerLoc.lng,
          note: markerNote,
          type: markerType,
          timestamp: Date.now()
      };
      const updated = [...markers, newMarker];
      setMarkers(updated);
      StorageService.saveMarkers(updated);
      
      setShowAddMarkerModal(false);
      setMarkerNote('');
      setTempMarkerLoc(null);
  };

  const triggerRecenter = () => window.dispatchEvent(new CustomEvent('recenter-map'));
  
  const clearAll = () => {
      if(confirm("Wait! This will delete ALL your history and markers. Are you sure?")) {
          StorageService.clearAll();
          window.location.reload();
      }
  };

  // Tutorial Content
  const steps = [
      { t: "Welcome!", b: "AreaHunt helps you track where you've been.", i: "👋" },
      { t: "Install Me", b: "Tap 'Install' top right to make me a real App.", i: "📲" },
      { t: "Green vs Yellow", b: "Green Line = Now\nYellow Line = Past Walks", i: "🎨" },
      { t: "Markers", b: "Tap the map to save a House 🏠 or Shop 🛒.", i: "📍" }
  ];

  return (
    <div className="h-[100dvh] w-full relative bg-gray-200 overflow-hidden">
      
      <MapComponent 
        currentLocation={currentLocation} 
        path={currentPath} 
        history={savedPaths} 
        markers={markers}
        onMapClick={handleMapClick}
      />

      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 z-10 p-4 pb-0 flex justify-between items-start pointer-events-none pt-safe">
          <div className="bg-white/90 backdrop-blur p-2 px-4 rounded-xl shadow-lg pointer-events-auto">
              <h1 className="font-bold text-gray-900">Area<span className="text-blue-600">Hunt</span></h1>
              <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-xs font-medium text-gray-600">{isTracking ? 'Tracking ON' : 'Paused'}</span>
              </div>
          </div>
          
          <div className="flex flex-col gap-3 items-end pointer-events-auto">
             {deferredPrompt && (
                 <button onClick={handleInstall} className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg animate-bounce">
                     Install App
                 </button>
             )}
             <button onClick={() => setIsAIModalOpen(true)} className="w-12 h-12 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center text-2xl hover:scale-110 transition-transform">
                 ✨
             </button>
          </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 inset-x-0 z-10 p-5 pb-safe bg-gradient-to-t from-black/50 to-transparent pointer-events-none">
          <div className="flex items-end gap-4 pointer-events-auto">
              <button onClick={triggerRecenter} className="bg-white h-12 w-12 rounded-full shadow-lg flex items-center justify-center text-xl active:bg-gray-100">
                  🎯
              </button>
              
              <button 
                onClick={() => setIsTracking(!isTracking)}
                className={`flex-1 h-14 rounded-2xl font-bold text-white shadow-xl text-lg tracking-wide active:scale-95 transition-all ${isTracking ? 'bg-red-500' : 'bg-blue-600'}`}
              >
                  {isTracking ? 'STOP HUNTING' : 'START HUNTING'}
              </button>

              <button onClick={clearAll} className="bg-white h-12 w-12 rounded-full shadow-lg flex items-center justify-center text-xl text-red-500 active:bg-red-50">
                  🗑️
              </button>
          </div>
      </div>

      {/* Tutorial Modal */}
      {showTutorial && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-6">
              <div className="bg-white p-6 rounded-3xl w-full max-w-xs text-center shadow-2xl">
                  <div className="text-6xl mb-4">{steps[tutorialStep].i}</div>
                  <h2 className="text-xl font-bold mb-2">{steps[tutorialStep].t}</h2>
                  <p className="text-gray-600 mb-6 whitespace-pre-line leading-relaxed">{steps[tutorialStep].b}</p>
                  <button 
                    onClick={() => tutorialStep < steps.length - 1 ? setTutorialStep(s => s+1) : setShowTutorial(false)}
                    className="bg-blue-600 text-white w-full py-3 rounded-xl font-bold"
                  >
                      {tutorialStep < steps.length - 1 ? 'Next' : "Let's Go!"}
                  </button>
              </div>
          </div>
      )}

      {/* Add Marker Modal */}
      {showAddMarkerModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur flex items-center justify-center p-4">
              <div className="bg-white p-4 rounded-2xl w-full max-w-xs shadow-2xl animate-fade-in">
                  <h3 className="font-bold text-lg mb-4 text-center">Mark this spot</h3>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                      {(['house', 'shop', 'note'] as const).map(type => (
                          <button 
                            key={type} 
                            onClick={() => setMarkerType(type)}
                            className={`py-2 rounded-lg text-xs font-bold uppercase border-2 ${markerType === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-400'}`}
                          >
                              {type}
                          </button>
                      ))}
                  </div>
                  <textarea 
                    value={markerNote} 
                    onChange={e => setMarkerNote(e.target.value)}
                    placeholder="Description (e.g. 'Nice balcony, $1200/mo')" 
                    className="w-full bg-gray-100 p-3 rounded-xl text-sm mb-4 h-24 resize-none outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-3">
                      <button onClick={() => setShowAddMarkerModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-bold text-gray-500">Cancel</button>
                      <button onClick={saveMarker} className="flex-1 py-3 rounded-xl bg-blue-600 font-bold text-white shadow-lg">Save Marker</button>
                  </div>
              </div>
          </div>
      )}

      <AIAssistant isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} currentLocation={currentLocation} />
    </div>
  );
};

export default App;
