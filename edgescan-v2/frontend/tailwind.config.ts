import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: '#6366f1',
        surface: { DEFAULT: '#1a1d27', light: '#ffffff' },
        'score-strong': '#22c55e',
        'score-moderate': '#f59e0b',
        'score-weak': '#ef4444',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
