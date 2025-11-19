import React, { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent.tsx';
import AIAssistant from './components/AIAssistant.tsx';
import { Coordinate, SavedMarker } from './types.ts';
import { StorageService } from './services/storageService.ts';

// Configuration
const GPS_ACCURACY_THRESHOLD = 30; // meters
const MIN_DISTANCE_FOR_UPDATE = 0.00005; // ~5 meters

const App: React.FC = () => {
  // Data State
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
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

  const watchIdRef = React.useRef<number | null>(null);

  // PWA Install Prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  // Load Data
  useEffect(() => {
    const loadedHistory = StorageService.loadHistory();
    const loadedMarkers = StorageService.loadMarkers();
    setSavedPaths(loadedHistory);
    setMarkers(loadedMarkers);
    
    const activePath = StorageService.loadCurrentPath();
    if (activePath.length > 0) {
      setCurrentPath(activePath);
      setIsTracking(true);
      setShowTutorial(false); 
    } else if (loadedHistory.length > 0) {
      setShowTutorial(false);
    }
  }, []);

  // Tracking Logic
  const startTracking = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsTracking(true);
    
    const options = {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsAccuracy(accuracy);
        const timestamp = position.timestamp;

        const newCoord: Coordinate = { lat: latitude, lng: longitude, timestamp };
        setCurrentLocation(newCoord);

        // Filter for path recording: only record if GPS is good enough
        if (accuracy > GPS_ACCURACY_THRESHOLD * 2) return; 

        setCurrentPath(prevPath => {
            const lastPoint = prevPath[prevPath.length - 1];
            let shouldAdd = true;
            if (lastPoint) {
                const dist = Math.sqrt(
                    Math.pow(lastPoint.lat - latitude, 2) + 
                    Math.pow(lastPoint.lng - longitude, 2)
                );
                if (dist < MIN_DISTANCE_FOR_UPDATE) shouldAdd = false;
            }

            if (shouldAdd) {
                const updatedPath = [...prevPath, newCoord];
                StorageService.saveCurrentPath(updatedPath);
                return updatedPath;
            }
            return prevPath;
        });
      },
      (error) => {
        console.error("GPS Error:", error);
      },
      options
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    StorageService.archiveCurrentPath();
    if (currentPath.length > 0) {
        setSavedPaths(prev => [...prev, currentPath]);
    }
    setCurrentPath([]);
  };

  useEffect(() => {
    if (isTracking && watchIdRef.current === null) {
      startTracking();
    } else if (!isTracking && watchIdRef.current !== null) {
      stopTracking();
    }
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isTracking]);

  // Map Interactions
  const handleMapClick = (lat: number, lng: number) => {
    setTempMarkerLoc({ lat, lng });
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
    const updatedMarkers = [...markers, newMarker];
    setMarkers(updatedMarkers);
    StorageService.saveMarkers(updatedMarkers);
    setShowAddMarkerModal(false);
    setMarkerNote('');
    setTempMarkerLoc(null);
  };

  const recenterMap = () => {
    window.dispatchEvent(new CustomEvent('recenter-map'));
  };

  const clearHistory = () => {
      if(confirm("Delete all tracked paths and markers?")) {
          StorageService.clearAll();
          window.location.reload();
      }
  };

  const tutorialSteps = [
    {
        title: "Welcome to AreaHunt!",
        text: "Your offline-ready guide for exploring new areas.",
        icon: "🏡"
    },
    {
      title: "Install It",
      text: "Tap 'Install App' or 'Add to Home Screen' in Chrome menu to use this like a real app.",
      icon: "📲"
    },
    {
      title: "Colors",
      text: "🟢 Green = You are here now\n🟡 Yellow = Past walks\n⚪ White = Streets",
      icon: "🎨"
    },
    {
      title: "Actions",
      text: "Tap the map to mark a House or Shop.\nAsk AI about the area with the ✨ button.",
      icon: "📍"
    }
  ];

  return (
    <div className="relative h-[100dvh] w-full bg-gray-200 overflow-hidden font-sans">
      
      {/* Map Layer */}
      <MapComponent 
        currentLocation={currentLocation}
        path={currentPath}
        history={savedPaths}
        markers={markers}
        onMapClick={handleMapClick}
      />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 w-full z-10 p-4 flex justify-between items-start pointer-events-none pb-safe pt-safe">
        <div className="bg-white/90 backdrop-blur shadow-md rounded-xl p-2 px-3 pointer-events-auto">
          <h1 className="font-bold text-gray-800 leading-none">Area<span className="text-blue-600">Hunt</span></h1>
          <div className="flex items-center gap-1 mt-1">
            <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-xs text-gray-500 font-medium">{isTracking ? 'Tracking' : 'Paused'}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto items-end">
             {deferredPrompt && (
               <button onClick={handleInstallClick} className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg animate-bounce">
                 Install
               </button>
             )}
             <button onClick={() => setIsAIModalOpen(true)} className="h-10 w-10 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-500">
                ✨
             </button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 w-full p-4 pb-safe z-10 pointer-events-none bg-gradient-to-t from-black/40 to-transparent">
         <div className="flex items-end gap-3">
            
            {/* Recenter */}
            <button 
                onClick={recenterMap}
                className="pointer-events-auto bg-white text-gray-700 h-12 w-12 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform"
            >
                🎯
            </button>

            {/* Main Action */}
            <button 
                onClick={() => setIsTracking(!isTracking)}
                className={`pointer-events-auto flex-1 h-12 rounded-full font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${
                    isTracking ? 'bg-red-500' : 'bg-blue-600'
                }`}
            >
                {isTracking ? 'STOP' : 'START HUNTING'}
            </button>

             {/* Settings / Clear */}
            <button 
                onClick={clearHistory}
                className="pointer-events-auto bg-white text-red-500 h-12 w-12 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform"
            >
                 🗑️
            </button>
         </div>
      </div>

      {/* Status Overlay */}
      {isTracking && !currentLocation && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-none">
            <div className="bg-white px-6 py-4 rounded-2xl shadow-xl flex flex-col items-center animate-pulse">
                <div className="text-2xl mb-2">📡</div>
                <div className="font-bold text-gray-800">Locating...</div>
            </div>
        </div>
      )}

      {/* Modals */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center shadow-2xl">
             <div className="text-5xl mb-4">{tutorialSteps[tutorialStep].icon}</div>
             <h2 className="text-xl font-bold text-gray-900 mb-2">{tutorialSteps[tutorialStep].title}</h2>
             <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">{tutorialSteps[tutorialStep].text}</p>
             <button 
               onClick={() => {
                 if (tutorialStep < tutorialSteps.length - 1) setTutorialStep(s => s + 1);
                 else setShowTutorial(false);
               }}
               className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold"
             >
               {tutorialStep < tutorialSteps.length - 1 ? 'Next' : 'Start Exploring'}
             </button>
          </div>
        </div>
      )}

      {showAddMarkerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-4 w-full max-w-xs shadow-2xl">
            <h3 className="font-bold text-lg mb-3">Mark Spot</h3>
            <div className="flex gap-2 mb-3">
                {(['house', 'shop', 'note'] as const).map(t => (
                    <button key={t} onClick={() => setMarkerType(t)} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${markerType === t ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>{t}</button>
                ))}
            </div>
            <textarea value={markerNote} onChange={e => setMarkerNote(e.target.value)} placeholder="Description..." className="w-full bg-gray-100 rounded-lg p-3 text-sm mb-3 h-20 resize-none outline-none" />
            <div className="flex gap-2">
                <button onClick={() => setShowAddMarkerModal(false)} className="flex-1 py-3 rounded-xl bg-gray-200 font-bold text-gray-600">Cancel</button>
                <button onClick={saveMarker} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold">Save</button>
            </div>
          </div>
        </div>
      )}

      <AIAssistant isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} currentLocation={currentLocation} />
    </div>
  );
};

export default App;
