import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
  // 不与 Arco Design 冲突
  corePlugins: {
    preflight: false,
  },
} satisfies Config;
