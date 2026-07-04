export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        navy: {
          DEFAULT: '#1e3a5f',
          light:   '#2d5282',
          dark:    '#0d1f3c',
        },
        cream: '#fafaf8',
        sand:  '#f5f0e8',
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
      },
    },
  },
  plugins: [],
};
