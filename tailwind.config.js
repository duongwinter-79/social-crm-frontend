const path = require("node:path");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, "apps/**/*.{ts,tsx,html}"),
    path.join(__dirname, "packages/**/*.{ts,tsx}")
  ],
  theme: {
    extend: {}
  },
  plugins: []
};
