/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#f8fafc',
          500: '#64748b',
          900: '#0f172a',
          950: '#020617',
        },
        indigo: {
          600: '#4f46e5',
        },
        emerald: {
          600: '#16a34a',
        },
        rose: {
          600: '#e11d48',
        },
      },
      fontFamily: {
        mono: ['Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
