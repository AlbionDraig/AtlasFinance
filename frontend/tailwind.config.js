/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#ca0b0b',
          hover: '#ac0505',
          deep: '#5f0404',
          light: '#fce8e8',
          text: '#8a0808',
        },
        success: {
          DEFAULT: '#0f7a55',
          bg: '#e6f4ef',
          text: '#0f5c40',
        },
        warning: {
          DEFAULT: '#c47a00',
          bg: '#fff4e0',
          text: '#8a5200',
        },
        neutral: {
          900: '#1c1b1a',
          700: '#4a4845',
          400: '#b0aeab',
          100: '#edeceb',
          50: '#f7f7f6',
        },
      },
    },
  },
}
