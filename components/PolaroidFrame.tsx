
import React, { memo } from 'react';
import { X } from 'lucide-react';

interface PolaroidFrameProps {
  id: string;
  imageSrc: string;
  caption?: string | null;
  timestamp: number;
  isDeveloping?: boolean;
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onDelete: (id: string) => void;
  onUpdateCaption: (id: string, caption: string) => void;
  className?: string;
}

export const PolaroidFrame = memo<PolaroidFrameProps>(({ 
  id,
  imageSrc, 
  caption,
  timestamp,
  isDeveloping = false,
  x,
  y,
  rotation,
  zIndex,
  isDragging,
  onMouseDown,
  onDelete,
  onUpdateCaption,
  className = "",
}) => {
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
    <div 
      onMouseDown={(e) => onMouseDown(e, id)}
      className={`bg-white p-2.5 pb-8 shadow-lg hover:shadow-2xl flex flex-col items-center cursor-move select-none absolute group ${className}`}
      style={{
        width: '170px',
        minHeight: '210px',
        left: x,
        top: y,
        transform: `rotate(${rotation}deg)`,
        zIndex: zIndex,
        boxShadow: isDragging ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        // CRITICAL FIX: Disable transition for left/top during drag to ensure 1:1 movement
        transition: isDragging 
          ? 'none' 
          : 'transform 0.2s ease-out, box-shadow 0.2s, left 1.2s cubic-bezier(0.25, 0.8, 0.25, 1), top 1.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
      }}
    >
      {/* Delete Button (Visible on Hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent drag start
          onDelete(id);
        }}
        className="absolute -top-3 -right-3 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 hover:scale-110 z-50"
        title="Discard Photo"
      >
        <X size={14} />
      </button>

      <div className="relative w-[150px] h-[150px] bg-stone-900 overflow-hidden mb-2 border border-stone-100/50 pointer-events-none">
        {/* Image Layer */}
        <img 
          src={imageSrc} 
          alt="Memory" 
          draggable={false}
          className={`w-full h-full object-cover transition-all duration-[5000ms] ease-out ${
            isDeveloping ? 'blur-md grayscale opacity-80 brightness-50 sepia' : 'blur-0 grayscale-0 opacity-100 brightness-100 sepia-[.2]'
          }`}
        />
        
        {/* Glossy Reflection Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
      </div>

      {/* Handwriting Area (Editable) - Shown Immediately */}
      <div className="h-6 w-full flex items-end justify-center mb-1">
        <input
          type="text"
          value={caption || ''}
          onChange={(e) => onUpdateCaption(id, e.target.value)}
          placeholder="Write a caption..."
          className="font-['Caveat'] text-lg leading-none text-stone-600 text-center bg-transparent border-none focus:ring-0 focus:outline-none w-full p-0 m-0 placeholder-stone-300 animate-fade-in"
          onMouseDown={(e) => e.stopPropagation()} // Allow interaction without dragging frame
          onClick={(e) => e.stopPropagation()} 
        />
      </div>

      {/* Timestamp footer - Centered */}
      <div className="absolute bottom-2 left-0 w-full text-center text-[9px] font-mono text-stone-400/60 pointer-events-none tracking-tight">
        {formatDate(timestamp)}
      </div>
    </div>
  );
});
