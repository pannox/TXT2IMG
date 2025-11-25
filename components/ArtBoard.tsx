import React, { useRef, useEffect, useState } from 'react';
import { ArtSettings, ShapeMask } from '../types';
import { calculateLayout } from '../utils/canvasUtils';

interface Props {
  settings: ArtSettings;
  names: string[];
  shape: ShapeMask;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  triggerGeneration: number; // Increment to trigger
  setDownloadTrigger: (cb: () => void) => void;
  setDownloadSvgTrigger: (cb: () => void) => void;
}

interface PlacedItem {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
}

const ArtBoard: React.FC<Props> = ({ 
  settings, 
  names, 
  shape, 
  isGenerating, 
  setIsGenerating, 
  triggerGeneration,
  setDownloadTrigger,
  setDownloadSvgTrigger
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [canvasSize, setCanvasSize] = useState(0);

  // High resolution multiplier
  const SCALE_FACTOR = 2; 

  const draw = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    setIsGenerating(true);
    setProgress(0);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set dimensions based on container but scaled up
    const rect = containerRef.current.getBoundingClientRect();
    // Make it square or fit the shape aspect ratio if known, here square is easiest for general purpose
    const size = Math.min(rect.width, rect.height) * SCALE_FACTOR; // 2x for retina/quality
    
    setCanvasSize(size);
    canvas.width = size;
    canvas.height = size;

    // Background Rendering
    if (settings.backgroundMode === 'image' && settings.backgroundImage) {
      try {
        await new Promise<void>((resolve) => {
          const bgImg = new Image();
          bgImg.crossOrigin = 'Anonymous';
          bgImg.src = settings.backgroundImage!;
          bgImg.onload = () => {
            // Draw image covering the canvas (like object-fit: cover)
            const imgRatio = bgImg.width / bgImg.height;
            const canvasRatio = size / size;
            let renderW, renderH, offsetX, offsetY;

            if (imgRatio > canvasRatio) {
              renderH = size;
              renderW = bgImg.width * (size / bgImg.height);
              offsetX = (size - renderW) / 2;
              offsetY = 0;
            } else {
              renderW = size;
              renderH = bgImg.height * (size / bgImg.width);
              offsetX = 0;
              offsetY = (size - renderH) / 2;
            }
            
            ctx.drawImage(bgImg, offsetX, offsetY, renderW, renderH);
            resolve();
          };
          bgImg.onerror = () => {
             // Fallback to white if fail
             ctx.fillStyle = '#ffffff';
             ctx.fillRect(0, 0, size, size);
             resolve();
          };
        });
      } catch (e) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
      }
    } else {
      // Solid Color
      ctx.fillStyle = settings.backgroundColor;
      ctx.fillRect(0, 0, size, size);
    }

    // Calculate packing
    try {
      const items = await calculateLayout(
        names,
        shape.url,
        size,
        size,
        settings,
        (pct) => setProgress(pct)
      );

      setPlacedItems(items); // Store for SVG export

      // Render items
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      items.forEach(item => {
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rotation * Math.PI / 180);
        ctx.font = `${item.fontSize}px "${settings.fontFamily}"`;
        ctx.fillStyle = settings.textColor;
        ctx.fillText(item.text, 0, 0);
        ctx.restore();
      });

    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerGeneration]);

  // Expose download PNG function
  useEffect(() => {
    setDownloadTrigger(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `TextShape-Arte-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }, [setDownloadTrigger]);

  // Expose download SVG function
  useEffect(() => {
    setDownloadSvgTrigger(() => {
      if (placedItems.length === 0) return;

      const backgroundSvg = settings.backgroundMode === 'image' && settings.backgroundImage
        ? `<image href="${settings.backgroundImage}" x="0" y="0" width="${canvasSize}" height="${canvasSize}" preserveAspectRatio="xMidYMid slice" />`
        : `<rect width="100%" height="100%" fill="${settings.backgroundColor}"/>`;

      const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}">
  ${backgroundSvg}
  ${placedItems.map(item => `
  <text 
    x="${item.x}" 
    y="${item.y}" 
    font-family="${settings.fontFamily}, sans-serif" 
    font-size="${item.fontSize}" 
    fill="${settings.textColor}" 
    text-anchor="middle" 
    dominant-baseline="middle" 
    transform="rotate(${item.rotation}, ${item.x}, ${item.y})"
  >${item.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`).join('')}
</svg>`;

      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `TextShape-Arte-${Date.now()}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    });
  }, [setDownloadSvgTrigger, placedItems, settings, canvasSize]);

  return (
    <div ref={containerRef} className="flex-1 bg-gray-100 flex items-center justify-center p-8 h-screen relative overflow-hidden">
      
      {/* Background Pattern for aesthetics */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      ></div>

      <div className="relative shadow-2xl bg-white rounded-sm p-4 md:p-12 max-h-full max-w-full aspect-square flex items-center justify-center border border-gray-200">
        <canvas 
          ref={canvasRef} 
          className="max-w-full max-h-full object-contain w-auto h-auto"
          style={{ width: '100%', height: '100%' }}
        />
        
        {isGenerating && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-opacity duration-300">
             <div className="w-64 bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-200 overflow-hidden">
                <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
             </div>
             <p className="text-sm font-medium text-gray-600 animate-pulse">Inserimento del testo nella forma...</p>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 right-8 text-xs text-gray-400 font-mono">
        CANVAS: {canvasRef.current?.width}x{canvasRef.current?.height}px
      </div>
    </div>
  );
};

export default ArtBoard;