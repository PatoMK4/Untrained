import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#141414',
        surface: '#1E1E1E',
        'surface-raised': '#242424',
        navbar: '#0F0F0F',
        accent: '#C8FF00',
        'text-primary': '#F0F0F0',
        'text-secondary': '#888888',
        'text-disabled': '#555555',
        danger: '#FF4444',
        warning: '#FFAA00',
        success: '#22CC66',
      },
      borderRadius: {
        card: '16px',
        pill: '9999px',
      },
      animation: {
        'pulse-lime': 'pulse-lime 2s ease-in-out infinite',
        'score-pop': 'score-pop 0.6s ease-out forwards',
        'slide-up': 'slide-up 0.3s ease-out forwards',
        'achievement-in': 'achievement-in 0.8s ease-out forwards',
      },
      keyframes: {
        'pulse-lime': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(200,255,0,0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(200,255,0,0)' },
        },
        'score-pop': {
          '0%': { transform: 'scale(1)', color: '#F0F0F0' },
          '50%': { transform: 'scale(1.15)', color: '#C8FF00' },
          '100%': { transform: 'scale(1)', color: '#F0F0F0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'achievement-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
