import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:       '#080b12',
        surf1:    '#0f1420',
        surf2:    '#161c2e',
        surf3:    '#1e2540',
        border:   'rgba(255,255,255,0.06)',
        primary:  '#e2e8f8',
        muted:    '#6b7a99',
        accent:   '#4f8ef7',
        green:    '#22d47e',
        red:      '#f75f5f',
        amber:    '#f5a623',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"Inter"',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '12px',
        cell: '8px',
        pill: '20px',
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.06)',
      },
    },
  },
  plugins: [],
}

export default config
