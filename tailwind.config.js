/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#1E1E1E',
        pumpkin: '#FF7518',
        creeper: '#39C040',
        nether: '#7A28CB',
        cobblestone: '#757575',
        dirt: '#3b2716',
      },
      fontFamily: {
        pixel: ['"VT323"', 'monospace'],
        block: ['"Press Start 2P"', 'cursive'],
      },
      boxShadow: {
        'block': '4px 4px 0px 0px rgba(0, 0, 0, 1)',
        'block-sm': '2px 2px 0px 0px rgba(0, 0, 0, 1)',
        'block-glow': '4px 4px 0px 0px rgba(255, 117, 24, 0.5)',
      }
    },
  },
  plugins: [],
}