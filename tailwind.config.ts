import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        ink: "var(--ink)",
        ember: "var(--ember)",
        brass: "var(--brass)",
        slate: "var(--slate)"
      },
      boxShadow: {
        card: "0 24px 60px rgba(9, 17, 24, 0.12)",
        glow: "0 0 0 1px rgba(246, 191, 91, 0.18), 0 22px 52px rgba(246, 191, 91, 0.14)"
      },
      borderRadius: {
        panel: "30px"
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at 20% 20%, rgba(246,191,91,0.18), transparent 28%), radial-gradient(circle at 80% 0%, rgba(189,84,49,0.2), transparent 34%), linear-gradient(135deg, rgba(255,255,255,0.9), rgba(246,242,236,0.96))"
      }
    }
  },
  plugins: []
};

export default config;
