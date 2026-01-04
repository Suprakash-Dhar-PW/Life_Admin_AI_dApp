export default {
  theme: {
    extend: {
      animation: {
        'gradient': 'gradient 3s ease infinite',
        'shine': 'shine 1s',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shine: {
          '100%': { transform: 'translateX(100%)' },
        }
      }
    }
  }
}