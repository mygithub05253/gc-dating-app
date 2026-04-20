import type { Config } from 'tailwindcss';

/**
 * Ember Signal Design System — Tailwind Config
 * /design-consultation v1.0.0 · 2026-04-20
 * 단일 진실 소스: Frontend/admin/DESIGN.md
 */
const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Semantic colors — Ember Signal v1.0
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
      },
      borderRadius: {
        // 계층화 — AI slop 방지 (전체 동일 radius 금지)
        sm: 'var(--radius-sm)', // 4px
        md: 'var(--radius-md)', // 8px
        lg: 'var(--radius-lg)', // 12px
        xl: 'var(--radius-xl)', // 16px
      },
      fontFamily: {
        // 기본 sans는 body 에서 이미 지정, utility 로 접근용
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
        serif: ['Instrument Serif', 'ui-serif', 'Georgia', 'serif'],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SF Mono',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        // modular scale 1.25
        xs: ['0.75rem', { lineHeight: '1rem' }], // 12
        sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14
        base: ['1rem', { lineHeight: '1.5rem' }], // 16
        lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18
        xl: ['1.25rem', { lineHeight: '1.75rem' }], // 20
        '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24
        '3xl': ['2rem', { lineHeight: '2.25rem' }], // 32
        '4xl': ['3rem', { lineHeight: '1.1' }], // 48
        display: ['4rem', { lineHeight: '1', letterSpacing: '-0.02em' }], // 64 (KPI)
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        sm: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        md: '0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        lg: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 4px 10px -4px rgb(0 0 0 / 0.06)',
      },
      transitionDuration: {
        micro: '100ms',
        short: '180ms',
        medium: '240ms',
      },
      transitionTimingFunction: {
        enter: 'cubic-bezier(0, 0, 0.2, 1)', // ease-out
        exit: 'cubic-bezier(0.4, 0, 1, 1)', // ease-in
        move: 'cubic-bezier(0.4, 0, 0.2, 1)', // ease-in-out
      },
    },
  },
  plugins: [],
};

export default config;
