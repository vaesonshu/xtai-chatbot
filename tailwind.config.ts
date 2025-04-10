/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}' // 根据你的项目结构调整
  ],
  theme: {
    extend: {}
  },
  plugins: [
    require('tailwindcss-animate'), // 添加此行
    require('@tailwindcss/typography')
  ]
}
