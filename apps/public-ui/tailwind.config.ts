import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1a2430',
        brand: '#1f7a6f',
        brandLight: '#daf0ea'
      }
    }
  },
  plugins: []
} satisfies Config;
