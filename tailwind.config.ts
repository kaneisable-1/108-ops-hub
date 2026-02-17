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
        // 108 Performance brand palette
        navy: {
          50: '#E6EBF0',
          100: '#B3C1D1',
          200: '#8099B3',
          300: '#4D7094',
          400: '#264D7A',
          500: '#001a3c', // PRIMARY — 108 brand navy
          600: '#001530',
          700: '#001024',
          800: '#000B18',
          900: '#00060C',
          950: '#000306',
        },
        brand: {
          50: '#E6EBF0',
          100: '#B3C1D1',
          200: '#8099B3',
          300: '#4D7094',
          400: '#264D7A',
          500: '#001a3c', // maps to navy-500
          600: '#001530',
          700: '#001024',
          800: '#000B18',
          900: '#00060C',
        },
        steel: {
          50: '#F8F8F8',
          100: '#F0F0F0',
          200: '#E4E4E4',
          300: '#D1D1D1',
          400: '#A0A0A0',
          500: '#707372', // 108 secondary grey
          600: '#5A5C5B',
          700: '#434544',
          800: '#2D2E2D',
          900: '#171717',
        },
        // Semantic temperature — now with visual urgency
        hot: '#DC2626',    // red-600: unmissable
        warm: '#D97706',   // amber-600: attention
        cold: '#6B7280',   // gray-500: deprioritized
        // Sentiment single-value aliases (use hot/warm/cold for temperature badges)
        // Default Tailwind red/green/amber/yellow scales are preserved for shade usage
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 26, 60, 0.06), 0 1px 2px -1px rgba(0, 26, 60, 0.06)',
        'card-hover': '0 4px 12px 0 rgba(0, 26, 60, 0.08), 0 2px 4px -2px rgba(0, 26, 60, 0.06)',
        'panel': '0 8px 30px rgba(0, 26, 60, 0.12)',
      },
    },
  },
  plugins: [],
}

export default config
