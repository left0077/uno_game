/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // UNO卡牌色 - 高饱和度赌场风格
        'uno-red': '#e53935',
        'uno-yellow': '#ffc107',
        'uno-green': '#43a047',
        'uno-blue': '#1e88e5',
        'uno-wild': '#212121',
        // 柔和赌场主题色
        felt: {
          DEFAULT: '#1a3d2e',
          dark: '#122b20',
          light: '#2d5a45',
        },
        gold: {
          DEFAULT: '#c9a961',
          light: '#dbc078',
          dark: '#a88b4a',
        },
        cream: {
          DEFAULT: '#f5f0e1',
          muted: '#c4b8a0',
        },
        wood: {
          DEFAULT: '#4a3728',
          light: '#6b4f3a',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
