import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        disp: ['Barlow Condensed', 'Arial Narrow', 'sans-serif'],
        body: ['Barlow', 'Helvetica Neue', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        background: '#050505',
        'bg-2': '#0c0c0c',
        surface: '#131313',
        'surface-2': '#1a1a1a',
        line: '#242424',
        'line-2': '#2e2e2e',
        accent: '#c8ff00',
        'accent-dim': '#8aae00',
        'text-primary': '#f4f4f3',
        'text-2': '#c9c9c7',
        muted: '#8a8a86',
        'muted-2': '#5d5d5a',
        danger: '#ff4423',
        warning: '#ffb02e',
        info: '#6aa9ff',
        success: '#22CC66',
        // legacy aliases so existing components don't break
        navbar: '#050505',
        'text-secondary': '#8a8a86',
        'text-disabled': '#5d5d5a',
        'surface-raised': '#1a1a1a',
      },
      borderRadius: {
        card: '2px',
        pill: '2px',
      },
    },
  },
  plugins: [],
} satisfies Config
