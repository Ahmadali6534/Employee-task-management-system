/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B1220",
          900: "#111A2E",
          800: "#1B2740",
          700: "#28365A",
          600: "#3A4C78",
        },
        brand: {
          50: "#EEF4FF",
          100: "#DCE8FF",
          300: "#9DB8F5",
          500: "#3E63DD",
          600: "#3151C4",
          700: "#2740A0",
        },
        surface: "#F6F7FB",
        line: "#E4E7EF",
        success: "#1E9E6C",
        warning: "#C77A16",
        danger: "#D6483F",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(17, 26, 46, 0.06), 0 1px 3px rgba(17, 26, 46, 0.08)",
      },
    },
  },
  plugins: [],
};
