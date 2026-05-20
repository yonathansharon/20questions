/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        hebrew: ['"Frank Ruhl Libre"', '"David Libre"', 'serif'],
      },
      colors: {
        'quiz-yellow': '#F5C518',
        'quiz-blue-bg': '#E8F4FD',
        'quiz-dark': '#1A1A2E',
      }
    },
  },
  plugins: [],
}
