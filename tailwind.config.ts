/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        burgundy: { DEFAULT: '#5A1830', light: '#7A2848', dark: '#3A0D1C' },
        ivory: { DEFAULT: '#F6F0E8', dark: '#E8DFD0' },
        copper: { DEFAULT: '#B66A45', light: '#CC8560', dark: '#8B4E30' },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
