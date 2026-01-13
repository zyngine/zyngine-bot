/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Zyngine brand colors based on logo
        zyngine: {
          // Backgrounds - dark navy blues
          dark: '#0a1628',
          darker: '#060f1a',
          light: '#0d1f35',
          lighter: '#132d4a',

          // Primary cyan/teal accents
          cyan: '#00D4AA',
          'cyan-light': '#2EECC6',
          'cyan-dark': '#00A88A',
          teal: '#0891B2',

          // Secondary colors
          green: '#10B981',
          red: '#EF4444',
          yellow: '#F59E0B',
          orange: '#F97316',
        },
        // Keep discord colors for compatibility
        discord: {
          dark: '#0a1628',
          darker: '#060f1a',
          light: '#0d1f35',
          lighter: '#132d4a',
          accent: '#00D4AA',
          'accent-dark': '#00A88A',
          green: '#10B981',
          red: '#EF4444',
          yellow: '#F59E0B',
          pink: '#EC4899',
          purple: '#8B5CF6',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-accent': 'linear-gradient(135deg, #00D4AA 0%, #0891B2 100%)',
        'gradient-success': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'gradient-danger': 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0d1f35 0%, #0a1628 100%)',
        'gradient-glow': 'linear-gradient(135deg, #00D4AA 0%, #2EECC6 50%, #0891B2 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'spin-slow': 'spin 8s linear infinite',
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
          '0%': { boxShadow: '0 0 20px rgba(0, 212, 170, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(0, 212, 170, 0.6)' },
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 212, 170, 0.3)',
        'glow-lg': '0 0 40px rgba(0, 212, 170, 0.4)',
        'glow-cyan': '0 0 30px rgba(0, 212, 170, 0.5)',
        'inner-glow': 'inset 0 0 20px rgba(0, 212, 170, 0.1)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
