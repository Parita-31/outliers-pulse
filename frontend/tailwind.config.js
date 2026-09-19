/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        c2: {
          // Paper Light Theme Surfaces
          paper: '#f8fafc',
          surface: '#f1f5f9',
          card: '#ffffff',
          'card-subtle': '#f8fafc',
          'card-hover': '#f1f5f9',
          
          // Borders
          border: '#e2e8f0',
          'border-light': '#f1f5f9',
          'border-dark': '#cbd5e1',
          
          // Typography
          text: '#0f172a',
          'text-muted': '#64748b',
          'text-subtle': '#94a3b8',
          
          // Header (Dark Strip)
          header: '#0f172a',
          'header-surface': '#1e293b',
          'header-border': '#334155',
          'header-text': '#f8fafc',
          'header-muted': '#94a3b8',
          
          // Tactical Severity & Status Tokens
          critical: '#dc2626',
          'critical-bg': '#fef2f2',
          'critical-border': '#fca5a5',
          'critical-text': '#b91c1c',
          
          high: '#ea580c',
          'high-bg': '#fff7ed',
          'high-border': '#fdba74',
          'high-text': '#c2410c',
          
          medium: '#d97706',
          'medium-bg': '#fffbeb',
          'medium-border': '#fcd34d',
          'medium-text': '#b45309',
          
          low: '#16a34a',
          'low-bg': '#f0fdf4',
          'low-border': '#86efac',
          'low-text': '#15803d',
          
          ai: '#7c3aed',
          'ai-bg': '#f5f3ff',
          'ai-border': '#c4b5fd',
          'ai-text': '#6d28d9',
          
          accent: '#2563eb',
          'accent-bg': '#eff6ff',
          'accent-border': '#93c5fd',
          'accent-text': '#1d4ed8',
          
          cyan: '#0891b2',
          'cyan-bg': '#ecfeff',
          'cyan-border': '#a5f3fc',
          'cyan-text': '#0e7490',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'badge-ping': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
