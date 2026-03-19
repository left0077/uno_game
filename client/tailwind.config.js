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
        // UNO卡牌色 - 保持鲜艳但降低一点饱和度
        'uno-red': '#e85a5a',
        'uno-yellow': '#e8c547',
        'uno-green': '#4caf7a',
        'uno-blue': '#5a9bd5',
        'uno-wild': '#3d4852',
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
