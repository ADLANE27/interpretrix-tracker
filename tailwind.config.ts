import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        interpreter: {
          navy: "#1a365d",
          available: "#10b981",
          unavailable: "#ef4444",
          pause: "#f97316",
          busy: "#8b5cf6"
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
