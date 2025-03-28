
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
      className="relative overflow-hidden rounded-full w-10 h-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-none shadow-inner hover:shadow-md hover:bg-white/90 dark:hover:bg-gray-700/90 text-gray-700 dark:text-gray-300"
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
