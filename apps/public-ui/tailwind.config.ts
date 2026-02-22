import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1a2430',
        brand: '#ec4899',
        brandLight: '#fce7f3'
      }
    }
  },
  plugins: []
} satisfies Config;
