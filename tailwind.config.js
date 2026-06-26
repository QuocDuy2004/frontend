/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./store/**/*.{js,jsx,ts,tsx}",
    "./types/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#f59e0b",
        dark: "#09090b"
      },
      fontFamily: {
        signika: ["Signika", "Signika Fallback", "sans-serif"]
      }
    }
  },
  plugins: []
};
