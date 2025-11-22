
import { FilterType, Photo } from "../types";

export const getDominantColor = (imageSrc: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('#f59e0b'); // Default amber
        return;
      }
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      resolve(`rgb(${r},${g},${b})`);
    };
    img.onerror = () => {
      resolve('#f59e0b'); // Default amber
    };
  });
};

// Helper to trigger download
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Generate a high-res canvas of the entire card (frame + photo + text)
export const createPolaroidCanvas = (photo: Photo): Promise<HTMLCanvasElement> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = photo.dataUrl;
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const cardWidth = 600;
      const cardHeight = 750; 
      const paddingX = 40;
      const paddingY = 40;
      const bottomPadding = 140; 
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(canvas);
        return;
      }

      canvas.width = cardWidth;
      canvas.height = cardHeight;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cardWidth, cardHeight);
      
      ctx.fillStyle = 'rgba(230,230,220,0.1)'; 
      for(let i=0; i<1000; i++) {
         ctx.fillRect(Math.random()*cardWidth, Math.random()*cardHeight, 2, 2);
      }

      const photoWidth = cardWidth - (paddingX * 2);
      const photoHeight = cardHeight - paddingY - bottomPadding;
      
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(paddingX, paddingY, photoWidth, photoHeight);

      const srcRatio = img.width / img.height;
      const destRatio = photoWidth / photoHeight;
      
      let drawWidth, drawHeight, offsetX, offsetY;

      if (srcRatio > destRatio) {
        drawHeight = photoHeight;
        drawWidth = photoHeight * srcRatio;
        offsetX = paddingX + (photoWidth - drawWidth) / 2;
        offsetY = paddingY;
      } else {
        drawWidth = photoWidth;
        drawHeight = photoWidth / srcRatio;
        offsetX = paddingX;
        offsetY = paddingY + (photoHeight - drawHeight) / 2;
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(paddingX, paddingY, photoWidth, photoHeight);
      ctx.clip();
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();

      ctx.shadowColor = "rgba(0,0,0,0.2)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0,0,0,0.1)";
      ctx.strokeRect(paddingX, paddingY, photoWidth, photoHeight);

      if (photo.caption) {
        ctx.fillStyle = '#44403c'; 
        ctx.font = '40px "Caveat", cursive'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textCenterY = cardHeight - (bottomPadding / 2);
        const textCenterX = cardWidth / 2;
        ctx.fillText(photo.caption, textCenterX, textCenterY);
      }

      resolve(canvas);
    };
  });
};


export const applyVintageFilter = (
  imageSrc: string, 
  filterType: FilterType, 
  beautyLevel: number = 0
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      // --- BEAUTYPIXEL SIMULATION ---
      if (beautyLevel > 0) {
        const strength = beautyLevel / 100; 
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
          tempCtx.drawImage(canvas, 0, 0);
          const blurRadius = 3 + (strength * 8); 
          tempCtx.filter = `blur(${blurRadius}px)`;
          tempCtx.drawImage(canvas, 0, 0);
          tempCtx.filter = 'none';

          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = 0.5 * strength; 
          ctx.drawImage(tempCanvas, 0, 0);

          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1.0;
        }
      }

      // --- STRONG VINTAGE FILTERS ---
      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = canvas.width;
      baseCanvas.height = canvas.height;
      const bCtx = baseCanvas.getContext('2d');
      bCtx?.drawImage(canvas, 0, 0);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;

      switch (filterType) {
        case FilterType.RETRO_CLASSIC:
          // Golden Hour / Old Kodak Look: Warm, high saturation, soft contrast
          ctx.filter = 'sepia(0.4) saturate(1.4) contrast(1.1) brightness(1.05)';
          ctx.drawImage(baseCanvas, 0, 0);
          ctx.filter = 'none';
          
          // Strong warm overlay
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = 'rgba(255, 190, 100, 0.3)'; 
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          break;

        case FilterType.RETRO_NOIR:
          // Dramatic High Contrast B&W
          ctx.filter = 'grayscale(1) contrast(1.8) brightness(0.9)';
          ctx.drawImage(baseCanvas, 0, 0);
          ctx.filter = 'none';
          
          // Heavy Vignette
          const gradNoir = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width/3, canvas.width/2, canvas.height/2, canvas.width * 0.8);
          gradNoir.addColorStop(0, 'rgba(0,0,0,0)');
          gradNoir.addColorStop(1, 'rgba(0,0,0,0.7)');
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = gradNoir;
          ctx.fillRect(0,0,canvas.width, canvas.height);
          break;

        case FilterType.RETRO_INSTANT:
          // Expired Film: Washed out blacks (blue tint), creamy whites, low saturation
          ctx.filter = 'contrast(1.1) brightness(1.2) saturate(0.85) sepia(0.2)';
          ctx.drawImage(baseCanvas, 0, 0);
          ctx.filter = 'none';
          
          // "Screen" blue to lift the shadows
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = 'rgba(30, 40, 100, 0.25)'; 
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Warm up the highlights slightly
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = 'rgba(255, 240, 200, 0.15)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          break;

        case FilterType.CINE_TEAL_ORANGE:
          // Blockbuster: Strong Teal Shadows, Orange Skin Tones
          ctx.filter = 'contrast(1.2) saturate(1.1)';
          ctx.drawImage(baseCanvas, 0, 0);
          ctx.filter = 'none';

          // Push Orange into highlights
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = 'rgba(255, 160, 0, 0.4)'; 
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Push Teal into shadows
          ctx.globalCompositeOperation = 'color-burn';
          ctx.fillStyle = 'rgba(0, 220, 255, 0.4)'; 
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          break;

        case FilterType.CINE_MOODY:
          // Dark, Desaturated, Greenish
          ctx.filter = 'saturate(0.7) contrast(1.4) brightness(0.85)';
          ctx.drawImage(baseCanvas, 0, 0);
          ctx.filter = 'none';
          
          ctx.globalCompositeOperation = 'overlay';
          ctx.fillStyle = 'rgba(20, 60, 50, 0.6)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          break;

        case FilterType.CINE_VIVID:
          // Slide Film: Extreme Saturation and Contrast
          ctx.filter = 'saturate(2.2) contrast(1.2) brightness(1.05)';
          ctx.drawImage(baseCanvas, 0, 0);
          ctx.filter = 'none';
          
          // Slight purple tint to make reds pop
          ctx.globalCompositeOperation = 'soft-light';
          ctx.fillStyle = 'rgba(80, 0, 100, 0.1)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          break;
          
        case FilterType.ORIGINAL:
        default:
          ctx.drawImage(baseCanvas, 0, 0);
          break;
      }

      // --- UNIVERSAL GRAIN (Stronger) ---
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 1.0;
      
      // Increase grain for all retro modes
      const noiseAmount = filterType === FilterType.ORIGINAL ? 0 : (filterType === FilterType.RETRO_NOIR ? 45 : 25);
      
      if (noiseAmount > 0) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const noise = (Math.random() - 0.5) * noiseAmount; 
          data[i] = Math.max(0, Math.min(255, data[i] + noise));
          data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
          data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
        }
        ctx.putImageData(imageData, 0, 0);
      }

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(imageSrc);
  });
};
