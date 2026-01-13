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
          dark: '#0f0f1a',
          darker: '#0a0a12',
          light: '#1a1a2e',
          lighter: '#252542',
          accent: '#5865F2',
          'accent-dark': '#4752c4',
          green: '#57F287',
          red: '#ED4245',
          yellow: '#FEE75C',
          pink: '#EB459E',
          purple: '#9b59b6',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-accent': 'linear-gradient(135deg, #5865F2 0%, #9b59b6 100%)',
        'gradient-success': 'linear-gradient(135deg, #57F287 0%, #43b581 100%)',
        'gradient-danger': 'linear-gradient(135deg, #ED4245 0%, #c73e3a 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(88, 101, 242, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(88, 101, 242, 0.6)' },
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(88, 101, 242, 0.3)',
        'glow-lg': '0 0 40px rgba(88, 101, 242, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(88, 101, 242, 0.1)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
