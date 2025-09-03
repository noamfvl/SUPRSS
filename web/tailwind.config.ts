import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class', 
  content: [
    './app/**/*.{ts,tsx}',         
    './components/**/*.{ts,tsx}', 
    './lib/**/*.{ts,tsx}',          
    './src/**/*.{ts,tsx}',         
  ],
  theme: {
    extend: {
      colors: { brand: { DEFAULT: '#139188ff', dark: '#227771ff' }  },
    },
  },
  plugins: [],
} satisfies Config;
