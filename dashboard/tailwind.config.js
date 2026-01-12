/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          dark: '#1a1a2e',
          darker: '#16213e',
          accent: '#5865F2',
          green: '#57F287',
          red: '#ED4245',
        },
      },
    },
  },
  plugins: [],
};
