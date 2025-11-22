
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, LayoutGrid, Trash2 } from 'lucide-react';
import { Photo } from './types';
import { PolaroidFrame } from './components/PolaroidFrame';
import { RetroCamera } from './components/RetroCamera';
import { PhotoPreviewModal } from './components/PhotoPreviewModal';
import { generatePhotoCaption } from './services/geminiService';
import { getDominantColor } from './utils/imageUtils';

export default function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [dominantColor, setDominantColor] = useState<string>('#ef4444'); // Default red
  const [dragState, setDragState] = useState<{ id: string; startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const maxZIndex = useRef(10);
  
  // Use ref to access photos in event listeners without re-binding
  const photosRef = useRef(photos);
  photosRef.current = photos;

  // Sync selectedPhoto with the latest version in photos list
  // This ensures that when 'isDeveloping' flips to false in the main list, the modal updates too.
  useEffect(() => {
    if (selectedPhoto) {
      const freshPhoto = photos.find(p => p.id === selectedPhoto.id);
      // Only update if the object reference changed (implies property change like isDeveloping)
      if (freshPhoto && freshPhoto !== selectedPhoto) {
        setSelectedPhoto(freshPhoto);
      }
    }
  }, [photos, selectedPhoto]);

  // Handle new photo taken from Camera component
  const handlePhotoTaken = useCallback(async (newPhotoData: Photo, startPos?: {x: number, y: number}, enableAi: boolean = false) => {
    // Define the target "stack" position in top-left
    const stackX = 50 + (Math.random() * 20 - 10);
    const stackY = 100 + (Math.random() * 20 - 10);
    
    const newPhoto: Photo = {
      ...newPhotoData,
      // Start at the camera ejection point if provided, otherwise random center
      x: startPos ? startPos.x : (window.innerWidth / 2 - 85),
      y: startPos ? startPos.y : (window.innerHeight / 2 - 105),
      // Start at -2deg to match the end of the CSS `eject-up` animation
      rotation: startPos ? -2 : 0, 
      zIndex: ++maxZIndex.current,
      caption: "Beautiful Moment" // Default caption
    };

    // Update dominant color
    const color = await getDominantColor(newPhoto.dataUrl);
    setDominantColor(color);

    // Add photo immediately at starting position
    setPhotos(prev => [...prev, newPhoto]);

    // Trigger the fly animation to the stack after a brief delay to allow render
    setTimeout(() => {
      setPhotos(prev => prev.map(p => {
        if (p.id === newPhoto.id) {
          return { 
            ...p, 
            x: stackX, 
            y: stackY,
            rotation: (Math.random() * 6 - 3) // Add rotation only when it lands
          };
        }
        return p;
      }));
    }, 100);

    // Simulate chemical developing process
    setTimeout(() => {
      setPhotos(prev => prev.map(p => {
        if (p.id === newPhoto.id) {
          return { ...p, isDeveloping: false };
        }
        return p;
      }));
    }, 6000); 

    // Trigger AI Caption Generation ONLY if enabled
    if (enableAi) {
      generatePhotoCaption(newPhoto.dataUrl).then(aiCaption => {
        setPhotos(prev => prev.map(p => {
          // Only update if the caption is still default (user hasn't manually edited it yet)
          if (p.id === newPhoto.id && (p.caption === "Beautiful Moment" || !p.caption)) {
            return { ...p, caption: aiCaption };
          }
          return p;
        }));
      }).catch(err => console.error("AI Generation failed", err));
    }
  }, []);

  // Dragging Logic
  const handleMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    const photo = photosRef.current.find(p => p.id === id);
    if (!photo) return;

    // Bring to front
    const newZ = ++maxZIndex.current;
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, zIndex: newZ } : p));

    setDragState({
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: photo.x,
      initialY: photo.y
    });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState) return;
      
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      // Use functional update to avoid dependency on 'photos'
      setPhotos(prev => prev.map(p => {
        if (p.id === dragState.id) {
          return { ...p, x: dragState.initialX + dx, y: dragState.initialY + dy };
        }
        return p;
      }));
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (dragState) {
        // Check for Click vs Drag
        const moveX = Math.abs(e.clientX - dragState.startX);
        const moveY = Math.abs(e.clientY - dragState.startY);
        
        if (moveX < 5 && moveY < 5) {
          const photo = photosRef.current.find(p => p.id === dragState.id);
          if (photo) {
            setSelectedPhoto(photo);
          }
        }
        
        setDragState(null);
      }
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState]); // Removed 'photos' dependency to prevent listener thrashing

  // Update Caption
  const handleUpdateCaption = useCallback((id: string, newCaption: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, caption: newCaption } : p));
  }, []);

  // Organize Feature: Stack in Top-Left
  const organizePhotos = () => {
    // Define the "Stack" anchor point
    const anchorX = 50;
    const anchorY = 100;

    setPhotos(prev => prev.map((p, i) => ({
      ...p,
      // Move all to the same spot with slight randomness for a "messy pile" look
      x: anchorX + (Math.random() * 20 - 10),
      y: anchorY + (Math.random() * 20 - 10),
      rotation: (Math.random() * 12 - 6), // Random rotation between -6 and +6 degrees
      zIndex: i + 1
    })));
    
    // Reset Z-index counter to continue from the top of the stack
    maxZIndex.current = photos.length + 1;
  };

  const clearPhotos = () => {
    if (photos.length === 0) return;
    setPhotos([]);
  };

  const handleDeletePhoto = useCallback((id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
    if (selectedPhoto?.id === id) {
      setSelectedPhoto(null);
    }
  }, [selectedPhoto]);
  
  const handleDeleteFromModal = () => {
    if (!selectedPhoto) return;
    
    // Determine next photo before deleting
    const idx = photos.findIndex(p => p.id === selectedPhoto.id);
    const nextPhoto = photos[idx + 1] ?? photos[idx - 1] ?? null;
    
    setPhotos(prev => prev.filter(p => p.id !== selectedPhoto.id));
    setSelectedPhoto(nextPhoto);
  };

  // Navigation Logic for Preview Modal
  const getNavigationProps = () => {
    if (!selectedPhoto) return { hasPrev: false, hasNext: false };
    
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    return {
      hasPrev: currentIndex > 0,
      hasNext: currentIndex < photos.length - 1,
      currentIndex
    };
  };

  const handlePrevPhoto = () => {
    const { currentIndex, hasPrev } = getNavigationProps();
    if (hasPrev) setSelectedPhoto(photos[currentIndex - 1]);
  };

  const handleNextPhoto = () => {
    const { currentIndex, hasNext } = getNavigationProps();
    if (hasNext) setSelectedPhoto(photos[currentIndex + 1]);
  };

  return (
    <div className="h-screen w-full bg-stone-100 relative overflow-hidden flex flex-col">
      
      {/* Texture Overlay */}
      <div className="fixed inset-0 w-full h-full grain-overlay z-0 opacity-40 mix-blend-multiply pointer-events-none" />

      {/* Header - Hasselblad Style */}
      <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-[9999] pointer-events-none">
        <h1 className="text-2xl font-serif font-bold tracking-[0.2em] text-stone-900 flex items-center gap-3 pointer-events-auto uppercase">
          HASSELBLAD
        </h1>
        
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="text-xs font-mono text-stone-400 mr-2">
            {photos.length} SHOTS
          </div>
          
          <button 
            onClick={organizePhotos}
            disabled={photos.length === 0}
            className="bg-white/50 backdrop-blur-sm hover:bg-white border border-stone-200 text-stone-600 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LayoutGrid size={16} />
            Stack
          </button>

          <button 
            onClick={clearPhotos}
            disabled={photos.length === 0}
            className="bg-white/50 backdrop-blur-sm hover:bg-red-50 hover:text-red-500 hover:border-red-200 border border-stone-200 text-stone-500 p-1.5 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Clear All"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      {/* Free Canvas Gallery */}
      <main className="absolute inset-0 w-full h-full overflow-hidden">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-stone-400 animate-pulse pointer-events-none">
            <div className="w-24 h-24 border-4 border-stone-300 border-dashed rounded-xl flex items-center justify-center mb-4 opacity-50">
              <Camera size={40} />
            </div>
            <p className="text-lg font-medium">Ready to snap?</p>
            <p className="text-sm">Turn on the camera below.</p>
          </div>
        ) : (
          photos.map((photo) => (
            <PolaroidFrame 
              key={photo.id}
              id={photo.id}
              imageSrc={photo.dataUrl}
              caption={photo.caption}
              timestamp={photo.timestamp}
              isDeveloping={photo.isDeveloping}
              x={photo.x}
              y={photo.y}
              rotation={photo.rotation}
              zIndex={photo.zIndex}
              isDragging={dragState?.id === photo.id}
              onMouseDown={handleMouseDown}
              onDelete={handleDeletePhoto}
              onUpdateCaption={handleUpdateCaption}
            />
          ))
        )}
      </main>

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <PhotoPreviewModal 
          photo={selectedPhoto} 
          onClose={() => setSelectedPhoto(null)} 
          onPrev={handlePrevPhoto}
          onNext={handleNextPhoto}
          onDelete={handleDeleteFromModal}
          hasPrev={getNavigationProps().hasPrev}
          hasNext={getNavigationProps().hasNext}
        />
      )}

      {/* Persistent Retro Camera Widget */}
      <RetroCamera onPhotoTaken={handlePhotoTaken} accentColor={dominantColor} />

    </div>
  );
}
