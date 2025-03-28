
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={`
        relative overflow-hidden rounded-full w-10 h-10
        bg-gradient-to-br from-white/70 to-palette-soft-blue/30 
        dark:from-gray-800/80 dark:to-palette-ocean-blue/30 
        backdrop-blur-md
        border border-white/30 dark:border-gray-700/30
        shadow-inner transition-all duration-500
        hover:shadow-md hover:border-primary/30 
        text-gray-700 dark:text-gray-300
        hover:bg-gradient-to-r hover:from-palette-ocean-blue/20 hover:to-palette-vivid-purple/20
      `}
    >
      <motion.div
        initial={false}
        animate={{ 
          rotate: isDark ? 0 : 180,
          opacity: isDark ? 1 : 0,
          scale: isDark ? 1 : 0.5
        }}
        transition={{ duration: 0.5, type: "spring" }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Moon className="h-5 w-5" />
      </motion.div>
      
      <motion.div
        initial={false}
        animate={{ 
          rotate: isDark ? -180 : 0,
          opacity: isDark ? 0 : 1,
          scale: isDark ? 0.5 : 1
        }}
        transition={{ duration: 0.5, type: "spring" }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Sun className="h-5 w-5" />
      </motion.div>
      
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};
