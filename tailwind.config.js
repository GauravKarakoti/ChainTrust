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
        accent: {
          blue: '#3b82f6',
          purple: '#8b5cf6',
          cyan: '#06b6d4',
          green: '#10b981',
          red: '#ef4444',
          orange: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
}
