/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3757FF',
        accent: '#7C3AED',
        muted: '#F3F4F6',
        'muted-foreground': '#6B7280',
        border: '#E6E8EB',
        card: '#FFFFFF',
        foreground: '#0F172A',
        'primary-foreground': '#FFFFFF'
      },
      boxShadow: {
        xl: '0 10px 30px rgba(2,6,23,0.08)'
      }
    }
  },
  plugins: []
}
