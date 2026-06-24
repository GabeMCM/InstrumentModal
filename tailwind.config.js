/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./editor/**/*.{js,ts,jsx,tsx,html}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wood: {
          light: '#8B5A2B',
          DEFAULT: '#5C3A21',
          dark: '#2E1D10',
          board: '#1A110A'
        },
        gold: {
          light: '#FCE78E',
          DEFAULT: '#D4AF37',
          dark: '#AA8529',
        },
        chrome: {
          light: '#E8E9EB',
          DEFAULT: '#B0B5B9',
          dark: '#69727B',
        }
      },
      backgroundImage: {
        'wood-pattern': "linear-gradient(to right, #2E1D10, #5C3A21, #2E1D10)",
        'chrome-gradient': "linear-gradient(to bottom, #E8E9EB, #B0B5B9, #69727B, #B0B5B9)",
        'gold-gradient': "linear-gradient(to right, #FCE78E, #D4AF37, #AA8529)"
      }
    },
  },
  plugins: [],
}
