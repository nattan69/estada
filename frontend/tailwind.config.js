/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#1a1a2e',
          navy: '#16213e',
          gold: '#e2b04a',
        },
      },
    },
  },
  plugins: [],
}
