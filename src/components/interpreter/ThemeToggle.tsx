
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

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
        rounded-full w-9 h-9
        transition-all duration-300
        hover:bg-gray-100 dark:hover:bg-gray-800
        text-gray-600 dark:text-gray-300
      `}
    >
      {isDark ? (
        <Moon className="h-4 w-4 rotate-90 transition-all dark:rotate-0" />
      ) : (
        <Sun className="h-4 w-4 rotate-0 transition-all dark:rotate-90" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};
