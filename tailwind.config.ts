import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff', 100: '#dfe9ff', 200: '#c5d6fe', 300: '#a1bdfc',
          400: '#7b9bf8', 500: '#5b78f0', 600: '#4557e3', 700: '#3943c8',
          800: '#303aa0', 900: '#2d377e', 950: '#1b1f4b',
        },
        accent: {
          400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488',
        },
        ink: {
          50: '#f6f7fb', 100: '#eceef5', 200: '#d5d9e6', 300: '#b1b9cf',
          400: '#8792b0', 500: '#677297', 600: '#515c7d', 700: '#424a65',
          800: '#3a4054', 900: '#23283a', 950: '#161927',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(22,25,39,.05), 0 8px 24px -12px rgba(22,25,39,.18)',
        lift: '0 2px 4px rgba(22,25,39,.06), 0 16px 40px -16px rgba(22,25,39,.28)',
        glow: '0 0 0 1px rgba(91,120,240,.25), 0 8px 40px -8px rgba(91,120,240,.35)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.35' },
        },
        'grow-width': {
          '0%': { width: '0%' },
        },
      },
      animation: {
        'fade-up': 'fade-up .5s ease-out both',
        'fade-in': 'fade-in .4s ease-out both',
        shimmer: 'shimmer 1.4s linear infinite',
        float: 'float 5s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
