import { vaColors } from './src/lib/va-colors.js'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        va: vaColors,
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
      },
      keyframes: {
        'va-header-drawer': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'va-fade': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'va-header-drawer': 'va-header-drawer 0.2s ease-out both',
        'va-fade': 'va-fade 0.15s ease-out both',
      },
    },
  },
  plugins: [],
}
