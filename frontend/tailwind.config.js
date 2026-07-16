/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0A0A0F',
        'bg-secondary': '#111118',
        'bg-tertiary': '#1A1A28',
        'bg-elevated': '#1E1E30',
        'accent': '#6C63FF',
        'accent-light': '#8B84FF',
        'safe': '#22C55E',
        'threat': '#EF4444',
        'warning': '#F59E0B',
        'teal': '#0DCCB1',
        'text-primary': '#F1F0FF',
        'text-secondary': '#8B8BA7',
        'text-tertiary': '#4A4A6A',
      },
      fontFamily: {
        'display': ['Syne', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        'mono': ['Space Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
