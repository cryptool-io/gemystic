import type { Config } from 'tailwindcss';

/**
 * Design tokens are semantic, not literal — `surface` and `brand` rather than
 * `white` and `emerald`. Re-theming then means editing this file only, instead of
 * sweeping colour names through eighty components.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '420px',
        // Ultrawide tiers. Most sites stop at 1536px and leave half a 21:9
        // display empty; these let the grids keep growing instead.
        '3xl': '1920px',
        '4xl': '2560px',
      },
      colors: {
        canvas: '#f4f8f6', // page background — barely-there emerald tint
        surface: '#ffffff', // cards, panels
        'surface-2': '#eef5f1', // subtle fills, table stripes
        line: '#dbe7e1', // borders
        'line-strong': '#c3d6cd',

        fg: '#0c1f19', // primary text
        muted: '#57706a', // secondary text — 5.4:1 on canvas
        subtle: '#8397a0', // tertiary, decorative only

        brand: {
          DEFAULT: '#047857', // emerald 700 — 5.3:1 on white
          dark: '#065f46', // hover / active
          deep: '#043d2f', // headings
          soft: '#10a37f',
          tint: '#e6f4ef', // brand-tinted fills
          ring: '#a7d6c5',
        },

        accent: {
          DEFAULT: '#b45309', // amber 700, for certification badges
          dark: '#92400e',
          tint: '#fdf3e7',
        },
      },
      fontFamily: {
        sans: ['var(--font-plex)', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(12, 31, 25, 0.04), 0 8px 24px -12px rgba(12, 31, 25, 0.10)',
        lift: '0 2px 4px rgba(12, 31, 25, 0.05), 0 16px 40px -16px rgba(12, 31, 25, 0.18)',
        pop: '0 24px 60px -20px rgba(12, 31, 25, 0.28)',
      },
      maxWidth: {
        wrap: '104rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
