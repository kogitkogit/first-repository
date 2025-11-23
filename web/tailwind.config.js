/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1173d4",
        },
        "background-light": "#f6f7f8",
        "background-dark": "#101922",
        "surface-light": "#ffffff",
        "surface-dark": "#1a2530",
        "text-light": "#0d141b",
        "text-dark": "#e0e7f0",
        "subtext-light": "#4c739a",
        "subtext-dark": "#89a2bd",
        "border-light": "#cfdbe7",
        "border-dark": "#364559",
        "status-safe": "#2ECC71",
        "status-warning": "#F39C12",
        "status-danger": "#E74C3C",
      },
      fontFamily: {
        display: ["Inter", "Noto Sans KR", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
      },
      boxShadow: {
        card: "0 10px 30px -15px rgba(13,20,27,0.15)",
      },
    },
  },
  plugins: [],
};
