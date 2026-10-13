/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { ink: '#171717', panel: '#262626', flame: '#F97316' },
      fontFamily: { sans: ['DM Sans', 'sans-serif'], display: ['Barlow Condensed', 'sans-serif'] },
    },
  },
  plugins: [],
}
