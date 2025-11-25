import { Rect, Point, ArtSettings } from '../types';

export const loadCheckboxMask = async (
  imageUrl: string,
  width: number,
  height: number
): Promise<Uint8ClampedArray | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      // Draw image scaled to fit
      // Keep aspect ratio
      const scale = Math.min(width / img.width, height / img.height);
      const x = (width - img.width * scale) / 2;
      const y = (height - img.height * scale) / 2;
      
      // Clear with white (empty)
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      // Draw black shape
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      const imageData = ctx.getImageData(0, 0, width, height);
      resolve(imageData.data);
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
};

const isPointInMask = (x: number, y: number, width: number, data: Uint8ClampedArray): boolean => {
  // Boundary check
  if (x < 0 || y < 0 || x >= width) return false;
  
  const index = (Math.floor(y) * width + Math.floor(x)) * 4;
  // Boundary check for array length
  if (index < 0 || index >= data.length) return false;

  // Check if pixel is dark (part of the shape)
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  const avg = (r + g + b) / 3;
  return avg < 128; // Threshold for "black-ish"
};

const isRectInMask = (rect: Rect, width: number, height: number, data: Uint8ClampedArray): boolean => {
  // 1. Basic Image Boundary Check
  if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > width || rect.y + rect.height > height) return false;

  // 2. Shape Mask Check (Strict: 7 points)
  // Ensures corners, center, and mid-edges are ALL inside the black shape.
  
  // Top-Left
  if (!isPointInMask(rect.x, rect.y, width, data)) return false;
  // Top-Right
  if (!isPointInMask(rect.x + rect.width, rect.y, width, data)) return false;
  // Bottom-Left
  if (!isPointInMask(rect.x, rect.y + rect.height, width, data)) return false;
  // Bottom-Right
  if (!isPointInMask(rect.x + rect.width, rect.y + rect.height, width, data)) return false;
  
  // Center
  if (!isPointInMask(rect.x + rect.width/2, rect.y + rect.height/2, width, data)) return false;

  // Mid-Edges (Critical for thin diagonal shapes like wrenches)
  if (!isPointInMask(rect.x + rect.width/2, rect.y, width, data)) return false; // Top-Mid
  if (!isPointInMask(rect.x + rect.width/2, rect.y + rect.height, width, data)) return false; // Bottom-Mid

  return true;
};

const checkCollision = (rect: Rect, placedRects: Rect[]): boolean => {
  // Simple AABB collision
  // For better performance with thousands of items, a QuadTree would be ideal,
  // but for this scale (<5000 items), linear check is acceptable on modern devices.
  for (let i = placedRects.length - 1; i >= 0; i--) {
    const other = placedRects[i];
    if (
      rect.x < other.x + other.width &&
      rect.x + rect.width > other.x &&
      rect.y < other.y + other.height &&
      rect.y + rect.height > other.y
    ) {
      return true;
    }
  }
  return false;
};

// Main function to calculate layout
export const calculateLayout = async (
  names: string[],
  maskUrl: string,
  width: number,
  height: number,
  settings: ArtSettings,
  onProgress: (percent: number) => void
): Promise<{ text: string; x: number; y: number; fontSize: number; rotation: number }[]> => {
  
  const maskData = await loadCheckboxMask(maskUrl, width, height);
  if (!maskData) return [];

  const placedItems: { text: string; x: number; y: number; fontSize: number; rotation: number; rect: Rect }[] = [];
  const placedRects: Rect[] = [];

  let nameIndex = 0;
  
  // ALGORITHM CHANGE: "Decreasing Size Strategy"
  // Instead of random sizes, we start BIG and go SMALL.
  // This ensures the main volumes are filled with legible text, 
  // and details are filled with smaller text.
  
  let currentFontSize = settings.fontSizeMax;
  let failCount = 0;
  const maxFailuresBeforeShrink = 60; // How many failed attempts before we decide to shrink the font?
  
  const maxTotalItems = settings.iterations; // Hard limit on count

  while (currentFontSize >= settings.fontSizeMin && placedItems.length < maxTotalItems) {
    const text = names[nameIndex % names.length];
    
    // Calculate dimensions roughly
    // Average char width is ~0.6em for many fonts
    const textWidth = text.length * currentFontSize * 0.6; 
    const textHeight = currentFontSize * 0.8; // Cap height is usually less than em size

    let placed = false;
    
    // Try to place this word N times
    const attempts = 30;

    for (let attempt = 0; attempt < attempts; attempt++) {
      // Pick random spot
      const cx = Math.random() * width;
      const cy = Math.random() * height;

      // Fast fail: if center is white, skip immediately
      if (!isPointInMask(cx, cy, width, maskData)) continue;

      // Determine Rotation
      let rotation = 0;
      if (settings.rotation === 'vertical') rotation = -90;
      else if (settings.rotation === 'random') rotation = Math.random() > 0.5 ? 0 : -90;
      else if (settings.rotation === 'mixed') rotation = Math.random() < 0.5 ? 0 : (Math.random() < 0.5 ? -90 : 90);

      // Rotation bounds
      let effectiveW = textWidth;
      let effectiveH = textHeight;
      if (Math.abs(rotation) === 90) {
        effectiveW = textHeight;
        effectiveH = textWidth;
      }

      // Top-Left corner
      const x = cx - effectiveW / 2;
      const y = cy - effectiveH / 2;
      
      const spacing = settings.spacing;
      const rect: Rect = { 
        x: x - spacing, 
        y: y - spacing, 
        width: effectiveW + (spacing * 2), 
        height: effectiveH + (spacing * 2), 
        rotation: 0 
      };

      // Strict Shape Check
      if (!isRectInMask(rect, width, height, maskData)) {
        continue;
      }

      // Collision Check
      if (!checkCollision(rect, placedRects)) {
        placedItems.push({ text, x: cx, y: cy, fontSize: currentFontSize, rotation, rect });
        placedRects.push(rect);
        placed = true;
        break;
      }
    }

    if (placed) {
       nameIndex++;
       failCount = 0; // Reset failure count on success
    } else {
       failCount++;
    }

    // Logic to shrink font
    // If we fail too many times to place a word at current size, it means
    // the big open spaces are gone. Time to shrink.
    if (failCount > maxFailuresBeforeShrink) {
       currentFontSize -= 1; // Decrease by 1px
       failCount = 0; // Reset counter for new size
    }
    
    // Progress update to UI
    if (placedItems.length % 50 === 0) {
       onProgress((1 - (currentFontSize - settings.fontSizeMin) / (settings.fontSizeMax - settings.fontSizeMin)) * 100);
       await new Promise(r => setTimeout(r, 0)); 
    }
  }

  onProgress(100);
  return placedItems;
};
