const path = require("node:path");
const plugin = require("tailwindcss/plugin");
const tailwindColors = require("tailwindcss/colors");

/**
 * Runtime templates (see docs/UI_TEMPLATES.md) re-skin the app by setting CSS
 * variables, so every palette the components use resolves through
 * `--crm-<palette>-<shade>` instead of a baked-in hex. The defaults below are
 * Tailwind's own values, so with no template active the app renders exactly
 * as before. Variables hold "r g b" triplets so opacity modifiers such as
 * `bg-indigo-50/70` keep working.
 */
const THEMED_PALETTES = ["slate", "indigo", "blue", "emerald", "green", "amber", "yellow", "rose", "red"];
const SHADES = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];

function hexToTriplet(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16)).join(" ");
}

const themedColors = Object.fromEntries(
  THEMED_PALETTES.map((palette) => [
    palette,
    Object.fromEntries(SHADES.map((shade) => [shade, `rgb(var(--crm-${palette}-${shade}) / <alpha-value>)`]))
  ])
);

const defaultColorVariables = Object.fromEntries(
  THEMED_PALETTES.flatMap((palette) =>
    SHADES.map((shade) => [`--crm-${palette}-${shade}`, hexToTriplet(tailwindColors[palette][shade])])
  )
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, "apps/**/*.{ts,tsx,html}"),
    path.join(__dirname, "packages/**/*.{ts,tsx}")
  ],
  theme: {
    extend: {
      colors: themedColors
    }
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({ ":root": defaultColorVariables });
    })
  ]
};
