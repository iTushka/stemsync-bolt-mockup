/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          50: '#FBF1ED',
          100: '#F5DDD3',
          200: '#EBBBA8',
          300: '#DF9379',
          400: '#D27154',
          500: '#E07A5F',
          600: '#C95A3F',
          700: '#A8462F',
          800: '#873826',
          900: '#6B2D1F',
        },
        cream: {
          50: '#FDFBF8',
          100: '#FAF7F2',
          200: '#F4EFE7',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(120, 90, 70, 0.06), 0 4px 12px rgba(120, 90, 70, 0.04)',
        cardHover: '0 2px 8px rgba(120, 90, 70, 0.1), 0 8px 24px rgba(120, 90, 70, 0.08)',
        sheet: '0 -8px 32px rgba(60, 40, 25, 0.18)',
        fab: '0 4px 14px rgba(201, 90, 63, 0.4)',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        expandDown: {
          '0%': { height: '0', opacity: '0' },
          '100%': { height: 'var(--exp-h, auto)', opacity: '1' },
        },
      },
      animation: {
        slideUp: 'slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        fadeIn: 'fadeIn 0.2s ease-out',
        scaleIn: 'scaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
