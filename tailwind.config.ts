import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Merriweather', 'serif'], // Default body font
        headline: ['"IM Fell English SC"', 'serif'], // For section titles
        logo: ['"Cinzel Decorative"', 'serif'], // For the main "The Hunch" title
        code: ['Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
         // Specific colors from the new theme
        'parchment': {
          light: 'hsl(40, 75%, 94%)', // --background
          DEFAULT: 'hsl(40, 60%, 90%)', // Slightly darker for card variation
          dark: 'hsl(40, 50%, 88%)', // --muted
        },
        'sepia': {
          dark: 'hsl(35, 45%, 20%)', // --foreground
          medium: 'hsl(35, 30%, 40%)', // --muted-foreground
        },
        'rich-brown': 'hsl(30, 40%, 30%)', // --border
        'deep-red': 'hsl(0, 45%, 40%)', // --primary
      },
      borderRadius: {
        lg: 'var(--radius)', // e.g., 0.4rem
        md: 'calc(var(--radius) - 0.1rem)', // e.g., 0.3rem
        sm: 'calc(var(--radius) - 0.2rem)', // e.g., 0.2rem
      },
      boxShadow: {
        'inner-lg': 'inset 0 4px 10px 0 rgb(0 0 0 / 0.15)',
        'parchment': '0 2px 8px rgba(101, 67, 33, 0.12), 0 4px 16px rgba(101, 67, 33, 0.08)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'medieval-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px 0px rgb(51 51 51 / 0.4)' },
          '50%': { boxShadow: '0 0 16px 4px rgb(51 51 51 / 0.5)' },
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'hunch-glow': 'medieval-pulse 2.5s infinite ease-in-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
