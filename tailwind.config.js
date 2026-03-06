/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"], // Matches your structure
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0F4C5C',   // Deep Teal Blue
          secondary: '#D9F99D', // Soft Lime
          accent: '#FFFFFF',    // Pure White
        },
        surface: {
          light: '#F8FAFC',     // Cool Off-White (Light Mode Main)
          dark: '#0B1120',      // Deep Midnight (Dark Mode Main)
          cardLight: '#FFFFFF', // Solid White
          cardDark: '#111827',  // Dark Slate
        },
        text: {
          primary: '#0F172A',       // Rich Slate
          muted: '#475569',         // Muted Blue Gray
          darkPrimary: '#E5E7EB',   // Soft White
          darkMuted: '#94A3B8',     // Cool Gray Blue
        },
        action: {
          cta: '#0F766E',       // Professional Teal
          link: '#0891B2',      // Clear Cyan Blue
          success: '#15803D',   // Strong Green
          error: '#DC2626',     // Clear Red
          warning: '#D97706',   // Warm Amber
        },
        badge: {
          ai: '#06B6D4',        // Bright Cyan
          eco: '#65A30D',       // Olive Green
          premium: '#EAB308',   // Golden Yellow
          new: '#CFFAFE',       // Very Light Cyan
        }
      }
    },
  },
  plugins: [],
}