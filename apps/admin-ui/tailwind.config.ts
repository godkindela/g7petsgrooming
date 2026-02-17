import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#212831',
        sand: '#f5efe6',
        moss: '#cdd9ca',
        accent: '#c96a3d',
        accentDeep: '#8f4422'
      },
      boxShadow: {
        panel: '0 14px 30px rgba(19, 28, 36, 0.08)'
      }
    }
  },
  plugins: []
} satisfies Config;
