/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: Object.fromEntries([950, 900, 800, 700, 600].map((n) => [n, `rgb(var(--navy-${n}) / <alpha-value>)`])),
        violet: { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed' },
        cyan: { 300: '#7dd3fc', 400: '#38BDF8', 500: '#0ea5e9' },
        pink: { 400: '#F472B6' },
      },
      boxShadow: { glow: '0 0 40px -10px rgba(139,92,246,.45)' },
    },
  },
  plugins: [],
}
