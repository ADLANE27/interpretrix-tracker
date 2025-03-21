
import { useState, useEffect } from "react";

type Orientation = "portrait" | "landscape";

export function useOrientation() {
  const [orientation, setOrientation] = useState<Orientation>("portrait");

  useEffect(() => {
    const updateOrientation = () => {
      if (window.innerHeight > window.innerWidth) {
        setOrientation("portrait");
      } else {
        setOrientation("landscape");
      }
    };

    // Initial check
    updateOrientation();

    // Add event listeners
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);

    // Clean up
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  return orientation;
}
