import React, { useEffect, useState } from 'react';
import { FALLBACK_PRODUCT_IMAGE } from '../services/storeService';

interface CutoutImageProps {
  src: string;
  alt: string;
  className?: string;
  tintRed?: boolean;
}

/**
 * Automatically removes uniform studio backdrop (white / light gray) from product photos
 * using a border flood-fill algorithm on an offscreen canvas so the product can overlap
 * watermark typography or overflow container borders with true alpha transparency.
 */
export const CutoutProductImage: React.FC<CutoutImageProps> = ({
  src,
  alt,
  className = '',
  tintRed = false
}) => {
  const [processedSrc, setProcessedSrc] = useState<string>(src);

  useEffect(() => {
    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 700;
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // Sample corner pixel as reference background color
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];

        const isBackgroundLike = (idx: number): boolean => {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const saturation = maxC - minC;
          // Studio light gray/white background check
          return dist < 95 || (r > 185 && g > 185 && b > 185 && saturation < 28);
        };

        const visited = new Uint8Array(w * h);
        const queue = new Int32Array(w * h);
        let head = 0;
        let tail = 0;

        // Seed border pixels
        for (let x = 0; x < w; x++) {
          const topIdx = x;
          const botIdx = (h - 1) * w + x;
          if (isBackgroundLike(topIdx * 4)) {
            visited[topIdx] = 1;
            queue[tail++] = topIdx;
          }
          if (isBackgroundLike(botIdx * 4)) {
            visited[botIdx] = 1;
            queue[tail++] = botIdx;
          }
        }
        for (let y = 1; y < h - 1; y++) {
          const leftIdx = y * w;
          const rightIdx = y * w + (w - 1);
          if (isBackgroundLike(leftIdx * 4)) {
            visited[leftIdx] = 1;
            queue[tail++] = leftIdx;
          }
          if (isBackgroundLike(rightIdx * 4)) {
            visited[rightIdx] = 1;
            queue[tail++] = rightIdx;
          }
        }

        // BFS flood-fill from image borders
        while (head < tail) {
          const curr = queue[head++];
          const cx = curr % w;
          const cy = (curr - cx) / w;

          const neighbors = [
            cx > 0 ? curr - 1 : -1,
            cx < w - 1 ? curr + 1 : -1,
            cy > 0 ? curr - w : -1,
            cy < h - 1 ? curr + w : -1
          ];

          for (let i = 0; i < 4; i++) {
            const n = neighbors[i];
            if (n >= 0 && visited[n] === 0 && isBackgroundLike(n * 4)) {
              visited[n] = 1;
              queue[tail++] = n;
            }
          }
        }

        // Apply transparency and optional red metallic tint for promo headphone
        for (let p = 0; p < w * h; p++) {
          const idx = p * 4;
          if (visited[p] === 1) {
            data[idx + 3] = 0;
          } else {
            // Feather border edges slightly
            const cx = p % w;
            const cy = (p - cx) / w;
            let bgNeighbors = 0;
            if (cx > 0 && visited[p - 1]) bgNeighbors++;
            if (cx < w - 1 && visited[p + 1]) bgNeighbors++;
            if (cy > 0 && visited[p - w]) bgNeighbors++;
            if (cy < h - 1 && visited[p + w]) bgNeighbors++;

            if (bgNeighbors >= 2) {
              data[idx + 3] = 130;
            } else if (bgNeighbors === 1) {
              data[idx + 3] = 210;
            }

            if (tintRed) {
              // Give dark headband a glossy crimson studio highlight like the red Beats Solo Air
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;
              if (lum > 35 && lum < 210) {
                data[idx] = Math.min(255, Math.round(r * 0.6 + 175));
                data[idx + 1] = Math.round(g * 0.22);
                data[idx + 2] = Math.round(b * 0.25);
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        if (isMounted) {
          setProcessedSrc(canvas.toDataURL('image/png'));
        }
      } catch {
        if (isMounted) setProcessedSrc(src);
      }
    };

    return () => {
      isMounted = false;
    };
  }, [src, tintRed]);

  return (
    <img
      src={processedSrc}
      alt={alt}
      loading="eager"
      decoding="async"
      onError={(e) => {
        (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
      }}
      className={className}
    />
  );
};
