import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#f0f7f2",
          100: "#dcede2",
          200: "#bbdbc8",
          300: "#8ec2a4",
          400: "#5ea17c",
          500: "#3b825d",
          600: "#2b6847",
          700: "#235438",
          800: "#1e432e",
          900: "#1a3a27",
          950: "#0d1f15",
        },
        honey: {
          50: "#fdf8ed",
          100: "#f9edcb",
          200: "#f2d993",
          300: "#ecc05c",
          400: "#e5a832",
          500: "#d4903a",
          600: "#b8722f",
          700: "#96562a",
          800: "#7c4528",
          900: "#673a25",
        },
        cream: {
          50: "#fdfaf5",
          100: "#f9f3e8",
          200: "#f2e5ce",
          300: "#e8d0ac",
          400: "#dbb982",
          500: "#cfa05d",
        },
        earth: {
          600: "#8b5e3c",
          700: "#7a4f30",
          800: "#6b4228",
          900: "#5c3620",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "texture-paper":
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23000' fill-opacity='.05'/%3E%3C/svg%3E\")",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out forwards",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        shimmer: "shimmer 2s infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
