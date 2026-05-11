/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        playfair: ['"Playfair Display"', 'serif'],
        poppins:  ['Poppins', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
      },
      colors: {
        brand: {
          gold:   '#d6993c',
          goldLight: '#e8b86d',
          goldDark:  '#b37d2e',
          red:    '#982829',
          redLight: '#c23535',
          teal:   '#325862',
          tealLight: '#3d6b78',
          tealDark:  '#243f47',
          cream:  '#f4eaa8',
          creamDark: '#e8d87a',
          ivory:  '#fdf8e8',
        },
      },
      backgroundImage: {
        'brand-gradient':      'linear-gradient(135deg, #325862 0%, #3d6b78 100%)',
        'brand-gradient-warm': 'linear-gradient(135deg, #982829 0%, #d6993c 100%)',
        'brand-gradient-gold': 'linear-gradient(135deg, #d6993c 0%, #e8b86d 100%)',
      },
      boxShadow: {
        'brand':    '0 4px 20px rgba(50, 88, 98, 0.25)',
        'brand-lg': '0 8px 32px rgba(50, 88, 98, 0.35)',
        'gold':     '0 4px 20px rgba(214, 153, 60, 0.35)',
        'gold-lg':  '0 8px 32px rgba(214, 153, 60, 0.45)',
        'red':      '0 4px 20px rgba(152, 40, 41, 0.3)',
      },
      animation: {
        'fade-in':   'fadeIn 0.4s ease forwards',
        'slide-up':  'slideUp 0.35s cubic-bezier(.22,1,.36,1) forwards',
        'pop-in':    'popIn 0.3s cubic-bezier(.34,1.56,.64,1) forwards',
        'shimmer':   'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(20px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        popIn:   { '0%': { transform: 'scale(0.85)', opacity: '0' }, '70%': { transform: 'scale(1.03)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
};
