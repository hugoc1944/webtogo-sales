import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,js,jsx,mdx}",
    "./src/**/*.{ts,tsx,js,jsx,mdx}",
    "./components/**/*.{ts,tsx,js,jsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0e2a4a",   // azul escuro do login
          accent:  "#00b8b8",   // ciano WebtoGO
          paper:   "#f9fafb",
        },
        keyframes: {
          fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
          scaleIn: { from: { opacity: 0, transform: "scale(.98)" }, to: { opacity: 1, transform: "scale(1)" } },
        },
        animation: {
          fadeIn: "fadeIn .25s ease-out forwards",
          scaleIn: "scaleIn .18s ease-out forwards",
        },
      },
      fontFamily: {
        inter: ["var(--font-inter)"],
        mont:  ["var(--font-mont)"],
      },
    },
  },
  plugins: [],
};

export default config;
