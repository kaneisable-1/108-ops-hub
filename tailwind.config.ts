import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 108 Brand Blue — used surgically like Apple uses SF Blue
        accent: {
          DEFAULT: '#19B5E5',
          deep: '#0EA5D5',
          tint: 'rgba(25, 181, 229, 0.12)',
          glow: 'rgba(25, 181, 229, 0.22)',
        },
        // Meaning colors (semantic, not brand)
        success: '#2EBD85',
        warning: '#F5A623',
        danger: '#E5484D',
        neutral: '#8E8E93',
        narrative: '#6366F1',
        // Surfaces
        surface: {
          primary: '#FFFFFF',
          secondary: '#F5F5F7',
          tertiary: '#FAFAFA',
          elevated: '#FFFFFF',
        },
        // Text
        txt: {
          primary: '#1D1D1F',
          secondary: '#6E6E73',
          tertiary: '#AEAEB2',
          placeholder: '#C7C7CC',
        },
        // Sidebar
        sidebar: {
          bg: '#000000',
          text: '#FFFFFF',
          muted: 'rgba(255, 255, 255, 0.5)',
          hover: 'rgba(255, 255, 255, 0.06)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],       // 12px
        'sm': ['0.8125rem', { lineHeight: '1.25rem' }],   // 13px
        'base': ['0.9375rem', { lineHeight: '1.5rem' }],  // 15px
        'lg': ['1.0625rem', { lineHeight: '1.5rem' }],    // 17px
        'xl': ['1.375rem', { lineHeight: '1.75rem' }],    // 22px
        '2xl': ['1.75rem', { lineHeight: '2rem' }],       // 28px
      },
      letterSpacing: {
        'tighter': '-0.02em',
        'tight': '-0.01em',
        'normal': '0',
        'wide': '+0.01em',
        'wider': '0.04em',
        'widest': '0.06em',
      },
      borderRadius: {
        'xs': '6px',      // Tags, tiny badges
        'sm': '8px',      // Sidebar nav, icon buttons, badges
        'DEFAULT': '10px', // Inputs, search bars
        'md': '12px',     // Buttons
        'lg': '16px',     // Cards, stat tiles, kanban cards
        'xl': '20px',     // Large panels, kanban upper range
      },
      boxShadow: {
        'sm': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)',
        'lg': '0 12px 40px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)',
        'hover': '0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
        'blue-glow': '0 2px 8px rgba(25, 181, 229, 0.22)',
      },
      spacing: {
        '4.5': '18px',
        '5.5': '22px',
      },
      animation: {
        'slide-in-left': 'slide-in-left 250ms cubic-bezier(0.28, 0.11, 0.32, 1)',
        'slide-in-right': 'slide-in-right 320ms cubic-bezier(0.28, 0.11, 0.32, 1)',
        'slide-up': 'slide-up 320ms cubic-bezier(0.28, 0.11, 0.32, 1)',
        'fade-in': 'fade-in 140ms cubic-bezier(0.28, 0.11, 0.32, 1)',
        'scale-in': 'scale-in 140ms cubic-bezier(0.28, 0.11, 0.32, 1)',
      },
      keyframes: {
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.28, 0.11, 0.32, 1)',
      },
      maxWidth: {
        'content': '1100px',
        'detail': '720px',
        'card': '560px',
        'stat': '280px',
        'input': '400px',
        'popover': '320px',
        'table': '1100px',
      },
    },
  },
  plugins: [],
}

export default config
