import React, { useState, useEffect } from 'react';
import { getVaultImageSrc } from '../utils/testUtils';

/**
 * VaultImage component - handles loading images from vault directory
 * Supports both Electron (via IPC) and browser (via HTTP) environments
 */
const VaultImage = ({ 
  src, 
  alt = "Content visual", 
  className = "max-w-full h-auto", 
  style = {}, 
  loading = "lazy",
  ...props 
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      return;
    }

    const loadImage = async () => {
      setIsLoading(true);
      setHasError(false);
      
      console.log('VaultImage: Loading image:', src);
      console.log('VaultImage: Electron available:', !!window.electron);
      console.log('VaultImage: readVaultImage available:', !!window.electron?.readVaultImage);
      
      try {
        const imageUrl = await getVaultImageSrc(src);
        console.log('VaultImage: Got image URL:', imageUrl ? 'SUCCESS' : 'FAILED');
        if (imageUrl) {
          setImageSrc(imageUrl);
        } else {
          console.error('VaultImage: No image URL returned');
          setHasError(true);
        }
      } catch (error) {
        console.error('VaultImage: Error loading vault image:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [src]);

  if (!src) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={`${className} bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center`} style={style}>
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading image...</span>
      </div>
    );
  }

  if (hasError || !imageSrc) {
    return (
      <div className={`${className} bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 flex items-center justify-center`} style={style}>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Image not found: {src}
        </span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      onError={() => setHasError(true)}
      {...props}
    />
  );
};

export default VaultImage;
