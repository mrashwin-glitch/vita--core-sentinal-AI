/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#020617',
          900: '#0f172a',
          850: '#1e293b',
        }
      },
      fontSize: {
        '2xs': '0.68rem',
        '3xs': '0.58rem',
        '4xs': '0.48rem',
        '5xs': '0.38rem',
      },
      animation: {
        laserScanner: 'laserScanner 3.5s ease-in-out infinite',
        fadeIn: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        laserScanner: {
          '0%, 100%': { top: '0%' },
          '50%': { top: '100%' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
