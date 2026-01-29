/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        emerald: {
          deep: '#004336',
          medium: '#0A5C4A',
          dark: '#023027',
        },
        gold: {
          premium: '#A37E43',
          champagne: '#C4AF81',
        },
        ivory: '#F5F5F0',
        softgray: '#DDE5E1',
      }
    },
  },
  plugins: [],
}