
"use client";
import React from "react";
import { motion } from "framer-motion";
import { WorldMap } from "@/components/ui/world-map";

export function LampDemo() {
  // Sample connection dots for demonstration
  const connectionDots = [
    {
      start: { lat: 48.8566, lng: 2.3522 }, // Paris
      end: { lat: 40.7128, lng: -74.0060 }, // New York
    },
    {
      start: { lat: 35.6762, lng: 139.6503 }, // Tokyo
      end: { lat: 51.5074, lng: -0.1278 }, // London
    },
    {
      start: { lat: 1.3521, lng: 103.8198 }, // Singapore
      end: { lat: -33.8688, lng: 151.2093 }, // Sydney
    },
  ];

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <WorldMap dots={connectionDots} lineColor="#8B5CF6" />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.h1
          initial={{ opacity: 0.5, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="mt-8 bg-gradient-to-br from-slate-300 to-slate-500 py-4 bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl"
        >
          Connecting <br /> through languages
        </motion.h1>
      </div>
    </div>
  );
}
