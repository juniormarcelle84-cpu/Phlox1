import React, { useState, useEffect } from 'react';
import { FALLBACK_PRODUCT_IMAGE } from '../services/storeService';

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  priority?: boolean;
  fallbackSrc?: string;
  placeholderColor?: string;
}

/**
 * Normalizes static JPG catalog images to ultra-lightweight WebP format
 * for super-fast delivery on mobile 3G/4G networks in Togo.
 */
export const toWebpUrl = (url?: string): string => {
  if (!url) return FALLBACK_PRODUCT_IMAGE;
  // If it's a local /src/assets/images/*.jpg path, map to .webp
  if (url.includes('/src/assets/images/') && url.endsWith('.jpg')) {
    return url.replace(/\.jpg$/i, '.webp');
  }
  return url;
};

/**
 * Lightweight, high-performance LazyImage component with:
 * 1. Automatic WebP format resolution
 * 2. Native loading="lazy" (or eager if priority)
 * 3. Native decoding="async"
 * 4. Micro-shimmer placeholder skeleton during loading
 * 5. Smooth fade-in transition on load
 * 6. Graceful error fallback
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  wrapperClassName = '',
  priority = false,
  fallbackSrc = FALLBACK_PRODUCT_IMAGE,
  placeholderColor = 'bg-[#1B1A1B]',
  style,
  ...rest
}) => {
  const resolvedSrc = toWebpUrl(src);
  const [currentSrc, setCurrentSrc] = useState<string>(resolvedSrc);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    const nextSrc = toWebpUrl(src);
    setCurrentSrc(nextSrc);
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    if (!hasError && currentSrc !== fallbackSrc) {
      setHasError(true);
      setCurrentSrc(toWebpUrl(fallbackSrc));
    }
  };

  return (
    <div
      className={`relative overflow-hidden ${placeholderColor} ${wrapperClassName}`}
      style={{ isolation: 'isolate' }}
    >
      {/* Lightweight skeleton shimmer placeholder while loading */}
      {!isLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 flex items-center justify-center bg-gradient-to-r from-white/[0.03] via-white/[0.08] to-white/[0.03] animate-pulse pointer-events-none"
        >
          <svg
            className="w-6 h-6 text-white/15 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        </div>
      )}

      {/* Optimized Native Image */}
      <img
        src={currentSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={handleLoad}
        onError={handleError}
        referrerPolicy="no-referrer"
        className={`${className} transition-opacity duration-300 ease-out ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={style}
        {...rest}
      />
    </div>
  );
};
