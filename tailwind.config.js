/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        cad: {
          bg: '#0b0f17',
          panel: '#111827',
          border: '#1f2937',
          accent: '#3b82f6',
          hp: '#0ea5e9',
          vp: '#8b5cf6',
          xy: '#f59e0b',
          visible: '#e2e8f0',
          hidden: '#64748b',
          projector: '#475569',
        },
      },
    },
  },
  plugins: [],
};
