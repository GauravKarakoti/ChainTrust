/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0a0a', // Gritty asphalt black
          800: '#141414',
          700: '#1f1f1f',
          600: '#2d2d2d',
        },
        gta: {
          green: '#54b649', // Classic San Andreas Green
          blue: '#00a8f3',  // GTA V Menu Blue
          red: '#990000',   // Wasted Red
          hudBase: 'rgba(0, 0, 0, 0.85)', // Standard dark HUD
        },
        hallow: {
          orange: '#FF7518', // Pumpkin accent
          slime: '#39FF14',  // Toxic green accent
        }
      },
      fontFamily: {
        gta: ['Pricedown', 'sans-serif'], 
        hud: ['Chalet', 'ui-sans-serif', 'system-ui'],
      }
    },
  },
  plugins: [],
}