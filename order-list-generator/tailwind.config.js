"use strict"

/*
  Update tailwindcss version:
    1. Update tailwindcss settings
    2. pnpm run generate-css
    3. pnpm run generate-order-lists
*/

const stub = require("tailwindcss/stubs/defaultConfig.stub")

module.exports = {
  content: [],
  safelist: [{ pattern: /.+/ }],
  presets: [],
  darkMode: false, // or 'media' or 'class'
  theme: { ...stub.theme },
  variantOrder: [ ...stub.variantOrder ],
  plugins: [],
}
