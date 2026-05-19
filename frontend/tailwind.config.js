/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",  // ← enables dark mode via class "dark" on <html>
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // "indigo-50": "#EEF2FF",
        // "indigo-100": "#E0E7FF",
        // "indigo-700": "#4338CA",
        // "emerald-50": "#ECFDF5",
        // "emerald-100": "#D1FAE5",
        // "emerald-700": "#047857",
      },
        fontFamily: {
          sans: ["Inter","system-ui", "sans-serif"],
        },
    },
  },
  plugins: [require("@tailwindcss/forms")],
}