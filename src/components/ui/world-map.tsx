
import { useRef } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

interface MapProps {
  dots?: Array<{
    start: { lat: number; lng: number; label?: string };
    end: { lat: number; lng: number; label?: string };
  }>;
  lineColor?: string;
}

// Country outlines represented as arrays of [latitude, longitude] coordinates
const COUNTRIES_DATA = {
  // Simplified outlines of major countries/continents
  northAmerica: [
    [70, -125], [60, -140], [50, -130], [45, -125], [40, -120], [35, -115], 
    [30, -110], [25, -105], [30, -95], [35, -90], [40, -85], [45, -80], 
    [50, -70], [55, -65], [60, -75], [65, -85], [70, -100], [70, -125]
  ],
  southAmerica: [
    [15, -80], [5, -75], [0, -80], [-10, -75], [-20, -70], [-30, -75], 
    [-40, -65], [-50, -70], [-55, -65], [-50, -60], [-40, -60], [-30, -50], 
    [-20, -45], [-10, -50], [0, -55], [10, -65], [15, -80]
  ],
  europe: [
    [60, 0], [55, 10], [50, 15], [45, 20], [40, 25], [35, 30], 
    [40, 40], [45, 35], [50, 30], [55, 25], [60, 20], [65, 15], [60, 0]
  ],
  africa: [
    [35, -10], [30, 0], [25, 10], [20, 20], [15, 30], [10, 40], 
    [0, 45], [-10, 40], [-20, 35], [-30, 25], [-35, 20], [-30, 15], 
    [-25, 10], [-20, 0], [-10, -10], [0, -15], [10, -15], [20, -10], [30, -5], [35, -10]
  ],
  asia: [
    [70, 60], [60, 80], [50, 100], [40, 120], [30, 130], [20, 120], 
    [10, 110], [0, 100], [10, 90], [20, 80], [30, 70], [40, 60], 
    [50, 50], [60, 40], [70, 30], [70, 60]
  ],
  australia: [
    [-10, 110], [-20, 120], [-30, 130], [-40, 140], [-30, 150], 
    [-20, 145], [-10, 135], [-10, 120], [-10, 110]
  ]
};

export function WorldMap({
  dots = [],
  lineColor = "#0ea5e9",
}: MapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { theme } = useTheme();

  const projectPoint = (lat: number, lng: number) => {
    const x = (lng + 180) * (800 / 360);
    const y = (90 - lat) * (400 / 180);
    return { x, y };
  };

  const createCurvedPath = (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 50;
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
  };

  // Dot size and spacing for the world map
  const dotSize = 1;
  const dotSpacing = 10;
  
  // Generate dots for all countries
  const generateCountryDots = () => {
    const allDots = [];
    
    // For each country in our data
    Object.values(COUNTRIES_DATA).forEach((countryCoords) => {
      // For each coordinate pair, create dots around it
      countryCoords.forEach((coords, index) => {
        const [lat, lng] = coords;
        const { x, y } = projectPoint(lat, lng);
        
        // Create the main dot
        allDots.push(
          <circle 
            key={`country-dot-${index}-${lat}-${lng}`}
            cx={x}
            cy={y}
            r={dotSize}
            fill={theme === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)"}
          />
        );
        
        // Create some additional dots around this point
        for (let i = 0; i < 3; i++) {
          const offsetX = (Math.random() - 0.5) * dotSpacing;
          const offsetY = (Math.random() - 0.5) * dotSpacing;
          
          allDots.push(
            <circle 
              key={`country-dot-${index}-${lat}-${lng}-${i}`}
              cx={x + offsetX}
              cy={y + offsetY}
              r={dotSize * (Math.random() * 0.5 + 0.5)}
              fill={theme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}
            />
          );
        }
      });
    });
    
    return allDots;
  };

  return (
    <div className="w-full h-full dark:bg-black bg-white rounded-lg relative font-sans">
      <svg
        ref={svgRef}
        viewBox="0 0 800 400"
        className="w-full h-full absolute inset-0 pointer-events-none select-none"
      >
        {/* Country outlines represented as dots */}
        <g className="country-dots">
          {generateCountryDots()}
        </g>

        {/* Connection paths between dots */}
        {dots.map((dot, i) => {
          const startPoint = projectPoint(dot.start.lat, dot.start.lng);
          const endPoint = projectPoint(dot.end.lat, dot.end.lng);
          return (
            <g key={`path-group-${i}`}>
              <motion.path
                d={createCurvedPath(startPoint, endPoint)}
                fill="none"
                stroke="url(#path-gradient)"
                strokeWidth="1"
                initial={{
                  pathLength: 0,
                }}
                animate={{
                  pathLength: 1,
                }}
                transition={{
                  duration: 1,
                  delay: 0.5 * i,
                  ease: "easeOut",
                }}
                key={`start-upper-${i}`}
              />
            </g>
          );
        })}

        <defs>
          <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="5%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="95%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Connection points */}
        {dots.map((dot, i) => (
          <g key={`points-group-${i}`}>
            <g key={`start-${i}`}>
              <circle
                cx={projectPoint(dot.start.lat, dot.start.lng).x}
                cy={projectPoint(dot.start.lat, dot.start.lng).y}
                r="2"
                fill={lineColor}
              />
              <circle
                cx={projectPoint(dot.start.lat, dot.start.lng).x}
                cy={projectPoint(dot.start.lat, dot.start.lng).y}
                r="2"
                fill={lineColor}
                opacity="0.5"
              >
                <animate
                  attributeName="r"
                  from="2"
                  to="8"
                  dur="1.5s"
                  begin="0s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.5"
                  to="0"
                  dur="1.5s"
                  begin="0s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
            <g key={`end-${i}`}>
              <circle
                cx={projectPoint(dot.end.lat, dot.end.lng).x}
                cy={projectPoint(dot.end.lat, dot.end.lng).y}
                r="2"
                fill={lineColor}
              />
              <circle
                cx={projectPoint(dot.end.lat, dot.end.lng).x}
                cy={projectPoint(dot.end.lat, dot.end.lng).y}
                r="2"
                fill={lineColor}
                opacity="0.5"
              >
                <animate
                  attributeName="r"
                  from="2"
                  to="8"
                  dur="1.5s"
                  begin="0s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.5"
                  to="0"
                  dur="1.5s"
                  begin="0s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
