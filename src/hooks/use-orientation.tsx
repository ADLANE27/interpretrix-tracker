
import { useState, useEffect } from "react";

type Orientation = "portrait" | "landscape";

export function useOrientation() {
  const [orientation, setOrientation] = useState<Orientation>(() => {
    // Initial check
    return window.innerHeight > window.innerWidth ? "portrait" : "landscape";
  });

  useEffect(() => {
    const updateOrientation = () => {
      const newOrientation = window.innerHeight > window.innerWidth ? "portrait" : "landscape";
      if (newOrientation !== orientation) {
        setOrientation(newOrientation);
      }
    };

    // Add event listeners for both resize and orientation change
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);

    // Some mobile browsers might need a small delay after orientation change
    const handleOrientationChange = () => {
      setTimeout(updateOrientation, 100);
    };
    window.addEventListener("orientationchange", handleOrientationChange);

    // Clean up
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, [orientation]);

  return orientation;
}
