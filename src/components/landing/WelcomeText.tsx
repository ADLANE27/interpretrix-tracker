
import { motion } from "framer-motion";

const welcomeMessages = [
  "Bienvenue",
  "Welcome",
  "Bienvenidos",
  "Willkommen",
  "أهلا بك",
  "欢迎",
];

export const WelcomeText = () => {
  return (
    <div className="relative h-16 overflow-hidden">
      {welcomeMessages.map((message, index) => (
        <motion.div
          key={message}
          className="absolute w-full text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [20, 0, 0, -20],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: index * 3,
          }}
        >
          <span className="text-4xl font-playfair font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
            {message}
          </span>
        </motion.div>
      ))}
    </div>
  );
};
