/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
      colors: {
        registry: {
          canvas: "#faf9f6",
          surface: "#ffffff",
          elevated: "#f4f2eb",
          border: "#e6e2d8",
          ink: "#181a1e",
          muted: "#5c6370",
          "dark-canvas": "#0c0e12",
          "dark-surface": "#14171d",
          "dark-elevated": "#1b2029",
          "dark-border": "#242933",
        },
        tpo: {
          navy: "#132338",
          "navy-dark": "#0b1624",
          cobalt: "#1f4b82",
          "cobalt-hover": "#163863",
          accent: "#c85a17",
          "accent-hover": "#ab4b10",
          urgent: "#b3261e",
          "urgent-soft": "#fdf2f2",
          success: "#1b6840",
          "success-soft": "#f0fdf4",
        },
      },
    },
  },
  plugins: [],
};
