/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#1B1B24",
          900: "#1B1B24",
          800: "#302F39",
          700: "#464555",
          600: "#545f73",
          300: "#c7c4d8",
        },
        brand: {
          50: "#EEF4FF",
          100: "#dad7ff",
          300: "#c3c0ff",
          500: "#4F46E5",
          600: "#4338CA",
          700: "#3525CD",
        },
        surface: "#F9FAFB",
        line: "#E2E8F0",
        success: "#059669",
        warning: "#D97706",
        danger: "#DC2626",
      },
      fontFamily: {
        display: ["'Inter'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03)",
      },
    },
  },
  plugins: [],
};
