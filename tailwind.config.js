/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0e1a',
          800: '#0f1628',
          700: '#151d35',
          600: '#1e2847',
        },
        gta: {
          green: '#39FF14', // Toxic slime green (GTA SA + Halloween)
          red: '#8A0303',   // Blood red (Wasted)
          blue: '#5b21b6',  // Deep spooky purple (Midnight sky)
          orange: '#FF7518', // Pumpkin orange (Halloween pop)
          hudBase: 'rgba(15, 10, 25, 0.85)', // Translucent dark purple/black HUD
          star: '#FF7518'   // Orange wanted stars
        }
      },
      fontFamily: {
        gta: ['Pricedown', 'sans-serif'], // Use for WASTED, BUSTED, and titles
        hud: ['Chalet', 'ui-sans-serif', 'system-ui'], // Use for readable HUD text
      }
    },
  },
  plugins: [],
}