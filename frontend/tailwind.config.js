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
          badge: '#f5bcbc',
          'badge-text': '#7a0505',
        },
        success: {
          DEFAULT: '#0f7a55',
          bg: '#e6f4ef',
          text: '#0f5c40',
          badge: '#b8e3d4',
          'badge-text': '#0a4a32',
        },
        warning: {
          DEFAULT: '#c47a00',
          bg: '#fff4e0',
          text: '#8a5200',
          badge: '#ffd98a',
          'badge-text': '#6b4000',
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
