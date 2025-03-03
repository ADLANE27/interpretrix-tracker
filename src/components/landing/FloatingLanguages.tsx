
import { motion } from "framer-motion";
import { LANGUAGES } from "@/lib/constants";

export const FloatingLanguages = () => {
  const languageSample = LANGUAGES.slice(0, 15);
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none opacity-20">
      {languageSample.map((lang, index) => (
        <motion.div
          key={lang}
          className="absolute text-primary/50 font-light"
          initial={{ opacity: 0, y: 100 }}
          animate={{
            opacity: [0.3, 0.8, 0.3],
            x: `${Math.sin(index) * 20}px`,
            y: [0, -20, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: index * 0.2,
          }}
          style={{
            left: `${(index * 200) % window.innerWidth}px`,
            top: `${Math.random() * 100}%`,
          }}
        >
          {lang}
        </motion.div>
      ))}
    </div>
  );
};
