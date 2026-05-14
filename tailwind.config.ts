import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "agrisas-dark": "#1a4d42",
        "agrisas-medium": "#2a6b5f",
        "agrisas-mint": "#d4f1e9",
        "agrisas-light": "#e8f7f3",
      },
      fontFamily: {
        inter: ["var(--font-inter)", "sans-serif"],
        poppins: ["var(--font-poppins)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
