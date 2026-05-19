import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-red': '#E30613',
        'brand-blue': '#005A9C',
        'ok': '#16A34A',
        'warning-amber': '#F59E0B',
        'critical': '#DC2626',
        'bg-page': '#F8FAFC',
        'bg-card': '#FFFFFF',
        'text-primary': '#0F172A',
        'text-secondary': '#64748B',
        'text-tertiary': '#94A3B8',
        'border-ui': '#E2E8F0',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
        sm: '6px',
      },
    },
  },
  plugins: [],
}

export default config
