
import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { Power, SlidersHorizontal, Sparkles, Printer, MessageSquareText } from 'lucide-react';
import { Photo, FilterType } from '../types';
import { applyVintageFilter } from '../utils/imageUtils';

interface RetroCameraProps {
  onPhotoTaken: (photo: Photo, startPos?: {x: number, y: number}, enableAi?: boolean) => void;
  accentColor?: string;
}

export const RetroCamera = memo<RetroCameraProps>(({ onPhotoTaken }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null); // For taking the final photo
  const previewCanvasRef = useRef<HTMLCanvasElement>(null); // For real-time display
  const animationFrameRef = useRef<number>(0);
  
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isShooting, setIsShooting] = useState(false);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Dragging State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const isInitialized = useRef(false);

  // Settings State (with persistence)
  const [beautyLevel, setBeautyLevel] = useState(() => {
    const saved = localStorage.getItem('milu_beauty_level');
    return saved ? parseInt(saved, 10) : 80; 
  });
  
  const [activeFilter, setActiveFilter] = useState<FilterType>(() => {
    const saved = localStorage.getItem('milu_filter');
    return (saved as FilterType) || FilterType.CINE_MOODY; 
  });

  const [useAiCaption, setUseAiCaption] = useState(() => {
    const saved = localStorage.getItem('milu_ai_caption');
    return saved === 'true'; // Defaults to false if not set
  });

  // Initialize Position (Bottom Right)
  useEffect(() => {
    if (!isInitialized.current) {
      const initialWidth = 384; // Width of camera (w-96)
      const initialHeight = 250; 
      setPosition({
        x: window.innerWidth - initialWidth - 40,
        y: window.innerHeight - initialHeight - 40 
      });
      isInitialized.current = true;
    }
    
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 390),
        y: Math.min(prev.y, window.innerHeight - 260)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Click Outside to Close Settings
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showSettings && 
        settingsRef.current && 
        !settingsRef.current.contains(event.target as Node) &&
        settingsBtnRef.current &&
        !settingsBtnRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    };

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      let newX = e.clientX - dragOffset.current.x;
      let newY = e.clientY - dragOffset.current.y;

      const maxX = window.innerWidth - 50;
      const maxY = window.innerHeight - 50;
      
      newX = Math.max(-100, Math.min(newX, maxX));
      newY = Math.max(-100, Math.min(newY, maxY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Save settings
  useEffect(() => {
    localStorage.setItem('milu_beauty_level', beautyLevel.toString());
    localStorage.setItem('milu_filter', activeFilter);
    localStorage.setItem('milu_ai_caption', useAiCaption.toString());
  }, [beautyLevel, activeFilter, useAiCaption]);

  // Real-time Preview Loop
  const renderPreview = useCallback(() => {
    const video = videoRef.current;
    const canvas = previewCanvasRef.current;
    
    if (video && canvas && isCameraOn && !error && video.readyState === 4) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
           canvas.width = video.videoWidth;
           canvas.height = video.videoHeight;
        }

        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;

        // 1. Draw Raw Video (Mirrored)
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // 2. Real-time Beauty
        if (beautyLevel > 0) {
           const strength = beautyLevel / 100;
           ctx.save();
           ctx.filter = `blur(${5 + strength * 12}px)`;
           ctx.globalCompositeOperation = 'screen'; 
           ctx.globalAlpha = strength * 0.6; 
           
           ctx.translate(canvas.width, 0);
           ctx.scale(-1, 1);
           ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
           ctx.restore();
        }

        // 3. Filters (Updated to match imageUtils stronger presets)
        ctx.save();
        switch (activeFilter) {
            case FilterType.RETRO_CLASSIC:
                // Warm, saturated, high contrast
                ctx.filter = 'sepia(0.4) saturate(1.4) contrast(1.1) brightness(1.05)';
                break;
            case FilterType.RETRO_NOIR:
                // High Contrast B&W
                ctx.filter = 'grayscale(1) contrast(1.8) brightness(0.9)';
                break;
            case FilterType.RETRO_INSTANT:
                // Washed out blacks, low saturation
                ctx.filter = 'contrast(1.1) brightness(1.1) saturate(0.85) sepia(0.2)';
                break;
            case FilterType.CINE_TEAL_ORANGE:
                ctx.filter = 'contrast(1.2) saturate(1.1)';
                break;
            case FilterType.CINE_MOODY:
                ctx.filter = 'saturate(0.7) contrast(1.4) brightness(0.85)';
                break;
            case FilterType.CINE_VIVID:
                ctx.filter = 'saturate(2.2) contrast(1.2) brightness(1.05)';
                break;
            default:
                ctx.filter = 'none';
        }
        
        if (activeFilter !== FilterType.ORIGINAL) {
           // Apply Color Grading Layers
           ctx.globalCompositeOperation = 'overlay';
           if (activeFilter === FilterType.RETRO_CLASSIC) {
               ctx.fillStyle = 'rgba(255, 190, 100, 0.3)';
               ctx.fillRect(0, 0, canvas.width, canvas.height);
           } else if (activeFilter === FilterType.CINE_TEAL_ORANGE) {
               ctx.fillStyle = 'rgba(255, 160, 0, 0.3)';
               ctx.fillRect(0, 0, canvas.width, canvas.height);
               ctx.globalCompositeOperation = 'color-burn';
               ctx.fillStyle = 'rgba(0, 220, 255, 0.3)';
               ctx.fillRect(0, 0, canvas.width, canvas.height);
           } else if (activeFilter === FilterType.CINE_MOODY) {
               ctx.fillStyle = 'rgba(20, 60, 50, 0.5)';
               ctx.fillRect(0, 0, canvas.width, canvas.height);
           } else if (activeFilter === FilterType.RETRO_INSTANT) {
               ctx.globalCompositeOperation = 'screen';
               ctx.fillStyle = 'rgba(30, 40, 100, 0.25)'; // Blue tint for shadows
               ctx.fillRect(0, 0, canvas.width, canvas.height);
           }
        }
        ctx.restore();
      }
    }
    animationFrameRef.current = requestAnimationFrame(renderPreview);
  }, [beautyLevel, activeFilter, isCameraOn, error]);

  useEffect(() => {
    if (isCameraOn) {
        animationFrameRef.current = requestAnimationFrame(renderPreview);
    } else {
        cancelAnimationFrame(animationFrameRef.current);
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isCameraOn, renderPreview]);

  // Camera Init
  useEffect(() => {
    let mounted = true;
    let localStream: MediaStream | null = null;

    const manageCamera = async () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      if (!isCameraOn) {
        if (videoRef.current) videoRef.current.srcObject = null;
        return;
      }

      if (mounted) setError(null);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
           throw new Error("Camera API not supported");
        }

        let newStream: MediaStream | null = null;
        
        try {
          newStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 }, aspectRatio: 1 } 
          });
        } catch (e) { console.warn("Ideal camera failed"); }

        if (!newStream) {
          newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (mounted) {
          localStream = newStream;
          setStream(newStream);
          if (videoRef.current) {
            videoRef.current.srcObject = newStream;
            videoRef.current.play().catch(e => console.error("Autoplay prevented:", e));
          }
        } else {
          newStream.getTracks().forEach(track => track.stop());
        }
      } catch (err: any) {
        if (mounted) setError("Camera Unavailable");
      }
    };

    manageCamera();

    return () => {
      mounted = false;
      if (localStream) localStream.getTracks().forEach(track => track.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraOn]);

  const playSound = (type: 'shutter' | 'motor') => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const t = ctx.currentTime;

    if (type === 'shutter') {
       const oscClick = ctx.createOscillator();
       const gainClick = ctx.createGain();
       oscClick.connect(gainClick);
       gainClick.connect(ctx.destination);
       oscClick.type = 'square';
       oscClick.frequency.setValueAtTime(1800, t);
       oscClick.frequency.exponentialRampToValueAtTime(600, t + 0.02);
       gainClick.gain.setValueAtTime(0.4, t);
       gainClick.gain.exponentialRampToValueAtTime(0.01, t + 0.02);
       oscClick.start(t);
       oscClick.stop(t + 0.03);

    } else if (type === 'motor') {
       // Simulated Canon CP1300 Dye Sublimation Printer Sound
       const duration = 2.0; 
       
       // 1. The mechanical motor hum (Triangle wave for smoothness)
       const motorOsc = ctx.createOscillator();
       const motorGain = ctx.createGain();
       motorOsc.connect(motorGain);
       motorGain.connect(ctx.destination);
       
       motorOsc.type = 'triangle';
       motorOsc.frequency.setValueAtTime(180, t); 
       motorOsc.frequency.linearRampToValueAtTime(175, t + duration); 
       
       motorGain.gain.setValueAtTime(0, t);
       motorGain.gain.linearRampToValueAtTime(0.15, t + 0.1);
       motorGain.gain.setValueAtTime(0.15, t + duration - 0.1);
       motorGain.gain.linearRampToValueAtTime(0, t + duration);
       
       motorOsc.start(t);
       motorOsc.stop(t + duration);

       // 2. Slight high-frequency gear whine
       const gearOsc = ctx.createOscillator();
       const gearGain = ctx.createGain();
       gearOsc.connect(gearGain);
       gearGain.connect(ctx.destination);
       
       gearOsc.type = 'sine';
       gearOsc.frequency.setValueAtTime(800, t);
       gearGain.gain.setValueAtTime(0, t);
       gearGain.gain.linearRampToValueAtTime(0.02, t + 0.1);
       gearGain.gain.setValueAtTime(0.02, t + duration - 0.1);
       gearGain.gain.linearRampToValueAtTime(0, t + duration);
       
       gearOsc.start(t);
       gearOsc.stop(t + duration);
    }
  };

  const takePhoto = async () => {
    if (!videoRef.current || !captureCanvasRef.current || isShooting || !isCameraOn) return;
    if (videoRef.current.readyState < 2) return;

    playSound('shutter');
    setIsShooting(true);
    setShowSettings(false); 

    setTimeout(() => playSound('motor'), 400);

    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = size;
      canvas.height = size;

      const xOffset = (video.videoWidth - size) / 2;
      const yOffset = (video.videoHeight - size) / 2;
      
      context.save();
      context.translate(size, 0);
      context.scale(-1, 1);
      context.drawImage(video, xOffset, yOffset, size, size, 0, 0, size, size);
      context.restore();

      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const filteredDataUrl = await applyVintageFilter(rawDataUrl, activeFilter, beautyLevel);

      setTempPhoto(filteredDataUrl);

      const newPhoto: Photo = {
        id: Date.now().toString(),
        dataUrl: filteredDataUrl,
        caption: "", // Initial empty caption
        timestamp: Date.now(),
        isDeveloping: true,
        x: 0,
        y: 0,
        rotation: 0,
        zIndex: 0
      };

      // Wait for the CSS animation (2s) to fully complete
      setTimeout(() => {
        // Coordinate Calculation for Seamless Transition:
        // Camera Body Width: 384px (w-96)
        // Photo Width: 170px
        // Offset Left: (384 - 170) / 2 = 107px
        //
        // Dummy Element CSS Top: -4px
        // Animation TranslateY: -220px
        // Total Vertical Offset: -224px
        
        const startX = position.x + 107; 
        const startY = position.y - 224; 

        onPhotoTaken(newPhoto, { x: startX, y: startY }, useAiCaption);
        setIsShooting(false);
        setTempPhoto(null);
      }, 2050); // Slightly longer than 2s animation to ensure it settles at the end frame
    }
  };

  const togglePower = () => {
    setIsCameraOn(prev => !prev);
    if (isCameraOn) setShowSettings(false);
  };

  return (
    <div 
      className={`fixed z-[60] flex flex-col items-center select-none touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-move'}`}
      style={{ 
        left: position.x, 
        top: position.y,
        transition: isDragging ? 'none' : 'transform 0.2s ease-out' 
      }}
      onMouseDown={handleMouseDown}
    >
      
      {/* Settings Panel (Positioned to the LEFT of the camera) */}
      {showSettings && isCameraOn && (
        <div 
          ref={settingsRef}
          className="absolute right-full top-auto bottom-4 mr-6 w-72 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-stone-200 animate-slide-in-right flex flex-col gap-4 z-[70] cursor-default origin-bottom-right"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="space-y-1">
             <div className="flex justify-between text-xs text-stone-500 uppercase font-bold tracking-wide">
                <span className="flex items-center gap-1"><Sparkles size={12} className="text-pink-500"/> Beauty Level</span>
                <span>{beautyLevel}%</span>
             </div>
             <input 
                type="range" 
                min="0" 
                max="100" 
                value={beautyLevel}
                onChange={(e) => setBeautyLevel(parseInt(e.target.value))}
                className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
             />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-stone-500 uppercase font-bold tracking-wide mb-2">Filters</div>
            <div className="grid grid-cols-3 gap-2">
               {Object.values(FilterType).map((filter) => (
                 <button
                   key={filter}
                   onClick={() => setActiveFilter(filter)}
                   className={`text-[10px] leading-tight py-1.5 px-1 rounded border transition-all flex items-center justify-center text-center h-8 break-words
                     ${activeFilter === filter 
                       ? 'bg-stone-800 text-white border-stone-800 font-medium' 
                       : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}
                 >
                   {filter}
                 </button>
               ))}
            </div>
          </div>

          {/* AI Caption Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-100">
             <div className="flex items-center gap-2 text-xs text-stone-500 font-bold uppercase tracking-wide">
               <MessageSquareText size={14} className={useAiCaption ? "text-blue-500" : "text-stone-400"} />
               Smart Caption
             </div>
             <button
               onClick={() => setUseAiCaption(!useAiCaption)}
               className={`relative w-10 h-5 rounded-full transition-colors duration-200 ease-in-out ${useAiCaption ? 'bg-blue-500' : 'bg-stone-300'}`}
             >
               <span 
                 className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${useAiCaption ? 'translate-x-5' : 'translate-x-0'}`}
               />
             </button>
          </div>

          {/* Arrow pointing right to the camera settings button */}
          <div className="absolute bottom-8 -right-1.5 w-3 h-3 bg-white/90 rotate-45 border-t border-stone-200"></div>
        </div>
      )}

      {/* Eject Animation Dummy */}
      {isShooting && tempPhoto && (
        <div 
          className="absolute z-0 animate-eject-up pointer-events-none flex justify-center"
          style={{
            width: '170px',
            // Explicitly position exactly where the math expects it to be relative to parent
            // Parent is w-96 (384px). Photo is 170px. Center is (384-170)/2 = 107px.
            left: '107px',
            top: '-4px', // Equivalent to -top-1
          }}
        >
          <div 
            className="bg-white p-2.5 pb-8 shadow-lg flex flex-col items-center"
            style={{ width: '170px', minHeight: '210px' }}
          >
            <div className="w-[150px] h-[150px] bg-stone-900 overflow-hidden mb-2 border border-stone-100/50 relative">
              <img src={tempPhoto} alt="Developing" className="w-full h-full object-cover opacity-50 blur-sm grayscale contrast-125" />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
            </div>
            <div className="h-6 w-full flex items-end justify-center">
                 <div className="w-full h-1 bg-gray-100 rounded overflow-hidden mt-1">
                    <div className="h-full bg-stone-400 animate-pulse w-1/2 mx-auto" />
                 </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Body - Landscape Orientation */}
      <div className="relative bg-[#f4f1ed] rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),inset_0_-4px_6px_rgba(0,0,0,0.1)] border border-stone-200/50 w-96 h-60 z-10 box-border overflow-hidden">
        
        {/* Texture on body */}
        <div className="absolute inset-0 opacity-50 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/leather.png')] bg-repeat bg-[length:100px_100px] mix-blend-multiply" />

        {/* TOP LEFT: Hasselblad H Logo */}
        <div className="absolute top-7 left-7 z-20 pointer-events-none select-none">
            <span className="font-serif text-3xl italic font-bold text-stone-400/80">H</span>
        </div>

        {/* TOP RIGHT: Shutter Button (Lighter Red) */}
        <div className="absolute top-5 right-6 z-20">
            <button 
              onClick={takePhoto}
              disabled={isShooting || !!error || !isCameraOn}
              onMouseDown={(e) => e.stopPropagation()}
              className={`w-10 h-10 rounded-full border-[3px] shadow-[0_3px_5px_rgba(0,0,0,0.3)] transition-all active:scale-95 active:shadow-inner
                ${isShooting || !isCameraOn 
                  ? 'bg-red-900/80 border-stone-400 cursor-not-allowed shadow-none' 
                  : 'bg-[#ff7b7b] border-stone-300 hover:brightness-105 cursor-pointer'}`}
              aria-label="Take Photo"
            />
        </div>

        {/* CENTER: Lens Assembly */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-stone-900 rounded-full border-[6px] border-[#dcd9d5] shadow-[0_10px_20px_rgba(0,0,0,0.2),inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden ring-1 ring-white/40 group z-20">
           
           {/* Flash Element */}
           <div className={`absolute inset-0 bg-white z-30 pointer-events-none ${isShooting ? 'animate-flash' : 'opacity-0'}`} />

           {/* 1. Camera OFF State */}
           {!isCameraOn && (
             <div className="w-full h-full flex items-center justify-center bg-stone-900">
               <div className="w-2 h-2 bg-red-900 rounded-full animate-pulse shadow-[0_0_8px_red]" />
             </div>
           )}

           {/* 2. Error State */}
           {isCameraOn && error && (
             <div className="w-full h-full flex items-center justify-center text-stone-500 text-xs text-center px-4">
               {error}
             </div>
           )}

           {/* 3. Preview Stream */}
           {isCameraOn && !error && (
             <>
               <video ref={videoRef} autoPlay playsInline muted className="hidden" />
               <canvas ref={previewCanvasRef} className="w-full h-full object-cover z-10" />
               <div className="absolute inset-0 z-20 pointer-events-none opacity-30">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-white/50 rounded-full" />
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-red-500/50 rounded-full" />
               </div>
             </>
           )}

           {/* 4. Printing Overlay */}
           {isShooting && (
             <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center text-red-500 font-mono">
                <Printer className="animate-bounce mb-2" size={24} />
                <span className="text-xs tracking-widest animate-blink-text font-bold">PRINTING</span>
             </div>
           )}
           
           {/* Glass Reflections */}
           <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 pointer-events-none z-20 rounded-full" />
           <div className="absolute top-1/4 left-1/4 w-8 h-4 bg-white/10 blur-md rounded-[100%] rotate-[-45deg] z-20 pointer-events-none" />
        </div>

        {/* BOTTOM LEFT: Settings Button */}
        <div className="absolute bottom-5 left-6 z-20">
            <button 
               ref={settingsBtnRef}
               onClick={() => isCameraOn && setShowSettings(!showSettings)}
               onMouseDown={(e) => e.stopPropagation()}
               disabled={!isCameraOn}
               className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95
                ${showSettings 
                   ? 'bg-stone-800 text-white shadow-inner' 
                   : 'bg-[#e8e5e1] text-stone-500 shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-stone-300 hover:bg-[#efedea]'}`}
            >
              <SlidersHorizontal size={16} strokeWidth={2.5} />
            </button>
        </div>

        {/* BOTTOM RIGHT: Power Button */}
        <div className="absolute bottom-5 right-6 z-20">
            <button 
              onClick={togglePower}
              onMouseDown={(e) => e.stopPropagation()}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95
                ${isCameraOn 
                  ? 'bg-[#e8e5e1] text-green-600 shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)] border border-green-200/50' 
                  : 'bg-[#e8e5e1] text-stone-400 shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-stone-300 hover:bg-[#efedea]'}`}
              title={isCameraOn ? "Turn Off" : "Turn On"}
            >
              <Power size={16} strokeWidth={2.5} />
            </button>
        </div>

        <canvas ref={captureCanvasRef} className="hidden" />
      </div>
    </div>
  );
});
