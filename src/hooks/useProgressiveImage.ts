
import { useState, useEffect } from 'react';

export const useProgressiveImage = (src: string) => {
  const [sourceLoaded, setSourceLoaded] = useState<string | null>(null);

  useEffect(() => {
    // For URLs created with URL.createObjectURL (optimistic UI)
    if (src.startsWith('blob:')) {
      setSourceLoaded(src);
      return;
    }

    // Start with a small version or a placeholder
    setSourceLoaded(null);
    
    const img = new Image();
    img.src = src;
    img.onload = () => setSourceLoaded(src);

    return () => {
      img.onload = null;
    };
  }, [src]);

  return sourceLoaded;
};
