
import { useEffect, useRef } from 'react';

interface GradientBackgroundProps {
  className?: string;
}

export const GradientBackground = ({ className = '' }: GradientBackgroundProps) => {
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const particlesContainer = particlesRef.current;
    if (!particlesContainer) return;

    // Clear any existing particles
    particlesContainer.innerHTML = '';

    // Create fixed particles
    const fixedParticles = [
      { width: 100, height: 100, left: 10, top: 10, delay: 0, duration: 25 },
      { width: 150, height: 150, left: 30, top: 40, delay: 5, duration: 30 },
      { width: 120, height: 120, left: 60, top: 30, delay: 10, duration: 20 },
      { width: 130, height: 130, left: 80, top: 60, delay: 15, duration: 35 },
      { width: 90, height: 90, left: 20, top: 80, delay: 8, duration: 28 }
    ];

    fixedParticles.forEach(particle => {
      const div = document.createElement('div');
      div.classList.add('particle');
      div.style.width = `${particle.width}px`;
      div.style.height = `${particle.height}px`;
      div.style.left = `${particle.left}%`;
      div.style.top = `${particle.top}%`;
      div.style.animationDelay = `${particle.delay}s`;
      div.style.animationDuration = `${particle.duration}s`;
      particlesContainer.appendChild(div);
    });

    // Create additional random particles
    for (let i = 0; i < 15; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');
      
      // Random size between 30px and 150px
      const size = Math.random() * 120 + 30;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      
      // Random position
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      
      // Random animation delay and duration
      particle.style.animationDelay = `${Math.random() * 30}s`;
      particle.style.animationDuration = `${Math.random() * 20 + 15}s`;
      
      // Random gradient type
      const gradientType = Math.floor(Math.random() * 3);
      switch (gradientType) {
        case 0:
          particle.classList.add('particle-purple');
          break;
        case 1:
          particle.classList.add('particle-blue');
          break;
        case 2:
          particle.classList.add('particle-pink');
          break;
      }

      particlesContainer.appendChild(particle);
    }

    // Cleanup function
    return () => {
      if (particlesContainer) {
        particlesContainer.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none -z-10 ${className}`}>
      <div className="absolute inset-0 bg-background dark:bg-[#1A1F2C]" />
      <div ref={particlesRef} className="particles absolute inset-0 overflow-hidden" />
    </div>
  );
};

export default GradientBackground;
