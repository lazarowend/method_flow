/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta slate remapeada para variáveis CSS — permite o toggle claro/escuro
        slate: {
          50: 'var(--slate-100)',
          100: 'var(--slate-100)',
          200: 'var(--slate-200)',
          300: 'var(--slate-300)',
          400: 'var(--slate-400)',
          500: 'var(--slate-500)',
          600: 'var(--slate-600)',
          700: 'var(--slate-700)',
          800: 'var(--slate-800)',
          900: 'var(--slate-900)',
          950: 'var(--slate-950)',
        },
        // Azul vibrante (accent principal)
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Cores vivas para acentos por métrica
        vivid: {
          cyan: '#22d3ee',
          blue: '#3b82f6',
          violet: '#a78bfa',
          amber: '#fbbf24',
          rose: '#fb7185',
          emerald: '#34d399',
        },
      },
      fontFamily: {
        sans: [
          'Cascadia Code',
          'Cascadia Mono',
          'Consolas',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(59, 130, 246, 0.25), 0 0 24px -6px rgba(59, 130, 246, 0.5)',
        'glow-cyan': '0 0 0 1px rgba(34, 211, 238, 0.25), 0 0 24px -6px rgba(34, 211, 238, 0.5)',
        'glow-violet': '0 0 0 1px rgba(167, 139, 250, 0.25), 0 0 24px -6px rgba(167, 139, 250, 0.5)',
        'glow-amber': '0 0 0 1px rgba(251, 191, 36, 0.25), 0 0 24px -6px rgba(251, 191, 36, 0.5)',
        'glow-rose': '0 0 0 1px rgba(251, 113, 133, 0.25), 0 0 24px -6px rgba(251, 113, 133, 0.5)',
        'glow-emerald': '0 0 0 1px rgba(52, 211, 153, 0.25), 0 0 24px -6px rgba(52, 211, 153, 0.5)',
        card: '0 1px 2px rgba(0,0,0,0.5), 0 8px 24px -12px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'grid-soft':
          'linear-gradient(to right, rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(59,130,246,0.05) 1px, transparent 1px)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};