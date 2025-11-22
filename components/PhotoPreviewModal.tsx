
import React, { useEffect, useState } from 'react';
import { X, Download, Loader2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Photo } from '../types';
import { createPolaroidCanvas, downloadBlob } from '../utils/imageUtils';

interface PhotoPreviewModalProps {
  photo: Photo;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onDelete?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({ 
  photo, 
  onClose,
  onPrev,
  onNext,
  onDelete,
  hasPrev = false,
  hasNext = false
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Keyboard Navigation Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        onPrev();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrev, hasNext, onPrev, onNext, onClose]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photo.isDeveloping) return; // Prevent download while developing
    
    setIsGenerating(true);
    try {
      const canvas = await createPolaroidCanvas(photo);
      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, `milu-polaroid-${photo.id}.jpg`);
        }
        setIsGenerating(false);
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error("Failed to generate download", err);
      setIsGenerating(false);
    }
  };

  // Format timestamp as YYYY-MM-DD HH:mm
  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer transition-opacity" 
        onClick={onClose}
      />
      
      {/* Navigation Buttons (Visual) */}
      {hasPrev && (
        <button 
          onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
          className="absolute left-4 md:left-10 z-20 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all hover:scale-110 active:scale-95 hidden md:flex"
          aria-label="Previous Photo"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      {hasNext && (
        <button 
          onClick={(e) => { e.stopPropagation(); onNext?.(); }}
          className="absolute right-4 md:right-10 z-20 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all hover:scale-110 active:scale-95 hidden md:flex"
          aria-label="Next Photo"
        >
          <ChevronRight size={32} />
        </button>
      )}

      {/* Modal Content */}
      <div className="relative z-10 animate-scale-in group">
        
        {/* The Card */}
        <div className="bg-white p-4 pb-12 shadow-2xl rounded-sm w-[360px] md:w-[420px] max-w-full select-none">
          
          {/* Image Area */}
          <div className="relative w-full aspect-square bg-stone-900 overflow-hidden border border-stone-100 shadow-inner mb-6">
            {/* Main Image with Developing Animation */}
            <img 
              src={photo.dataUrl} 
              alt="Memory Detail" 
              className={`w-full h-full object-cover pointer-events-none transition-all duration-[5000ms] ease-out ${
                photo.isDeveloping 
                  ? 'blur-md grayscale opacity-80 brightness-50 sepia' 
                  : 'blur-0 grayscale-0 opacity-100 brightness-100 sepia-[.2]'
              }`}
            />
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
          </div>

          {/* Caption Area */}
          {photo.caption && (
            <div className="text-center min-h-[3rem] flex flex-col justify-center">
              <p className="font-['Caveat'] text-4xl text-stone-700 leading-none">
                {photo.caption}
              </p>
              <p className="text-xs font-mono text-stone-400 mt-3 uppercase tracking-widest">
                {formatDate(photo.timestamp)}
              </p>
            </div>
          )}
        </div>

        {/* Floating Controls - Bottom Right */}
        <div className="absolute -bottom-2 -right-16 flex flex-col gap-3">
           <button 
            onClick={handleDownload}
            disabled={isGenerating || photo.isDeveloping}
            title={photo.isDeveloping ? "Wait for photo to develop..." : "Download Full Card"}
            className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all active:scale-95 ${
                photo.isDeveloping
                 ? 'bg-stone-200 text-stone-400 cursor-not-allowed opacity-70'
                 : 'bg-white text-stone-800 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-70'
            }`}
          >
            {isGenerating ? <Loader2 size={20} className="animate-spin"/> : <Download size={20} />}
          </button>
          
          {onDelete && (
            <button 
              onClick={(e) => {
                 e.stopPropagation();
                 if(window.confirm('Delete this memory?')) onDelete();
              }}
              title="Delete Photo"
              className="flex items-center justify-center w-12 h-12 rounded-full bg-white text-red-500 shadow-lg hover:bg-red-50 hover:text-red-600 transition-all active:scale-95"
            >
              <Trash2 size={20} />
            </button>
          )}

          <button 
            onClick={onClose}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-stone-800 text-white shadow-lg hover:bg-stone-700 transition-all active:scale-95"
          >
            <X size={24} />
          </button>
        </div>

      </div>
    </div>
  );
};
