import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // --- Legacy palette (kept for /auth/*) ---
        "agrisas-dark": "#1a4d42",
        "agrisas-medium": "#2a6b5f",
        "agrisas-mint": "#d4f1e9",
        "agrisas-light": "#e8f7f3",

        // --- Material 3 "Agro-Systemic" palette ---
        primary: "#0d631b",
        "on-primary": "#ffffff",
        "primary-container": "#2e7d32",
        "on-primary-container": "#cbffc2",
        "primary-fixed": "#a3f69c",
        "primary-fixed-dim": "#88d982",
        "on-primary-fixed": "#002204",
        "on-primary-fixed-variant": "#005312",
        "inverse-primary": "#88d982",

        secondary: "#77574d",
        "on-secondary": "#ffffff",
        "secondary-container": "#fed3c7",
        "on-secondary-container": "#795950",
        "secondary-fixed": "#ffdbd0",
        "secondary-fixed-dim": "#e7bdb1",
        "on-secondary-fixed": "#2c160e",
        "on-secondary-fixed-variant": "#5d4037",

        tertiary: "#445963",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#5c717b",
        "on-tertiary-container": "#e1f4ff",
        "tertiary-fixed": "#cfe6f2",
        "tertiary-fixed-dim": "#b4cad6",
        "on-tertiary-fixed": "#071e27",
        "on-tertiary-fixed-variant": "#354a53",

        surface: "#f9f9f7",
        "on-surface": "#1a1c1b",
        "on-surface-variant": "#40493d",
        "surface-variant": "#e2e3e1",
        "surface-bright": "#f9f9f7",
        "surface-dim": "#dadad8",
        "surface-tint": "#1b6d24",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f4f4f2",
        "surface-container": "#eeeeec",
        "surface-container-high": "#e8e8e6",
        "surface-container-highest": "#e2e3e1",
        "inverse-surface": "#2f3130",
        "inverse-on-surface": "#f1f1ef",

        outline: "#707a6c",
        "outline-variant": "#bfcaba",

        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        background: "#f9f9f7",
        "on-background": "#1a1c1b",
      },
      fontFamily: {
        inter: ["var(--font-inter)", "sans-serif"],
        poppins: ["var(--font-poppins)", "sans-serif"],
      },
      fontSize: {
        // --- M3 typography scale ---
        "display-lg": [
          "57px",
          { lineHeight: "64px", letterSpacing: "-0.25px", fontWeight: "400" },
        ],
        "headline-lg": [
          "32px",
          { lineHeight: "40px", fontWeight: "600" },
        ],
        "headline-lg-mobile": [
          "28px",
          { lineHeight: "36px", fontWeight: "600" },
        ],
        "title-md": [
          "16px",
          { lineHeight: "24px", letterSpacing: "0.15px", fontWeight: "500" },
        ],
        "body-lg": [
          "16px",
          { lineHeight: "24px", letterSpacing: "0.5px", fontWeight: "400" },
        ],
        "body-md": [
          "14px",
          { lineHeight: "20px", letterSpacing: "0.25px", fontWeight: "400" },
        ],
        "label-lg": [
          "14px",
          { lineHeight: "20px", letterSpacing: "0.1px", fontWeight: "500" },
        ],
        "label-sm": [
          "11px",
          { lineHeight: "16px", letterSpacing: "0.5px", fontWeight: "500" },
        ],
      },
      spacing: {
        base: "8px",
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        gutter: "24px",
        "margin-mobile": "16px",
        "margin-desktop": "32px",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
