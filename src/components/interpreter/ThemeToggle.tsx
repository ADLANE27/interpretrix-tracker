
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
        relative overflow-hidden rounded-full w-9 h-9
        bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm
        border border-gray-200/50 dark:border-gray-700/50
        shadow-inner transition-all duration-500
        hover:shadow-md hover:border-primary/30 
        text-gray-600 dark:text-gray-300
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
        <Moon className="h-4 w-4" />
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
        <Sun className="h-4 w-4" />
      </motion.div>
      
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};
