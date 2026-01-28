/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",      // Expo Router
    "./components/**/*.{js,jsx,ts,tsx}",
    "./App.{js,jsx,ts,tsx}",           // if you still have App.tsx
  ],
  presets: [require("nativewind/preset")],
  theme: { extend: {} },
  plugins: [],
};
