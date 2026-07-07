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
          dark: "#131619",
          panel: "#1B1E23",
          tile: "#26292E",
          border: "#3A3D42",
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
