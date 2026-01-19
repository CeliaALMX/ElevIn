/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // <--- ESTA LÍNEA ES LA CLAVE PARA EL SWITCH MANUAL
  theme: {
    extend: {},
  },
  plugins: [],
}