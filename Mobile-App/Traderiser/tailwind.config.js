/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#22c55e',     // Green for profit
        danger: '#ef4444',      // Red for loss
        background: '#0a0a0a',
        card: '#121212',
        border: '#27272a',
      },
    },
  },
  plugins: [],
}