import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zoom: {
          blue: "#0E72ED",
          "blue-dark": "#0956B5",
          "blue-light": "#E7F1FD",
          orange: "#FF742E",
          "orange-dark": "#E85D1A",
          dark: "#0B0B0D",
          panel: "#131316",
          tile: "#1B1B1F",
          border: "#2E2E33",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
