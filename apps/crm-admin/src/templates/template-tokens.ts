import type { UiTemplateColorKey, UiTemplateTokens } from "@social-crm/api";

/**
 * Template tokens → CSS custom properties.
 *
 * tailwind.config.js routes every themed palette through `--crm-<palette>-<shade>`
 * ("r g b" triplets). A template picks one colour per family; we derive the
 * full 50–950 scale from it and write it onto each palette in that family, so
 * one choice re-skins every class that uses it (bg-indigo-600, text-rose-700…).
 */

export const SHADES = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;
export type Shade = (typeof SHADES)[number];

export type ColorFamily = {
  /** Tailwind palettes the family re-skins. */
  palettes: string[];
  /** Shade the picked colour lands on — the one used for solid fills. */
  anchor: Shade;
  /** Tailwind's value at `anchor` for the first palette (the built-in look). */
  defaultHex: string;
  label: { en: string; vi: string };
  hint: { en: string; vi: string };
};

export const COLOR_FAMILIES: Record<UiTemplateColorKey, ColorFamily> = {
  accent: {
    palettes: ["indigo", "blue"],
    anchor: "600",
    defaultHex: "#4f46e5",
    label: { en: "Accent / brand", vi: "Màu nhấn / thương hiệu" },
    hint: { en: "Primary buttons, links, active states", vi: "Nút chính, liên kết, trạng thái đang chọn" }
  },
  neutral: {
    palettes: ["slate"],
    anchor: "500",
    defaultHex: "#64748b",
    label: { en: "Neutral / greys", vi: "Màu trung tính" },
    hint: { en: "Text, borders, backgrounds, sidebar", vi: "Chữ, viền, nền, thanh bên" }
  },
  success: {
    palettes: ["emerald", "green"],
    anchor: "500",
    defaultHex: "#10b981",
    label: { en: "Success", vi: "Thành công" },
    hint: { en: "Approved, done, healthy", vi: "Đã duyệt, hoàn tất, ổn định" }
  },
  warning: {
    palettes: ["amber", "yellow"],
    anchor: "500",
    defaultHex: "#f59e0b",
    label: { en: "Warning", vi: "Cảnh báo" },
    hint: { en: "Pending, needs attention", vi: "Đang chờ, cần chú ý" }
  },
  danger: {
    palettes: ["rose", "red"],
    anchor: "500",
    defaultHex: "#f43f5e",
    label: { en: "Danger", vi: "Nguy hiểm" },
    hint: { en: "Errors, rejections, destructive actions", vi: "Lỗi, từ chối, thao tác xóa" }
  }
};

export const COLOR_KEYS = Object.keys(COLOR_FAMILIES) as UiTemplateColorKey[];

// How far each shade sits from the anchor: positive mixes toward white,
// negative toward black. Index 1 is the anchor-500 position of shade "50";
// index 0 gives one extra lighter step for anchors above 500.
const MIX_STEPS = [0.97, 0.95, 0.9, 0.77, 0.6, 0.33, 0, -0.18, -0.36, -0.52, -0.64, -0.78];
const ANCHOR_500_INDEX = 6;

type Rgb = [number, number, number];

export function parseHex(hex: string): Rgb | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = match[1];
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16)) as Rgb;
}

function mix(color: Rgb, target: number, amount: number): Rgb {
  return color.map((channel) => Math.round(channel + (target - channel) * amount)) as Rgb;
}

/** Full shade scale for one picked colour, as "r g b" triplets. */
export function generateScale(hex: string, anchor: Shade): Record<Shade, string> | null {
  const base = parseHex(hex);
  if (!base) return null;
  const anchorIndex = SHADES.indexOf(anchor);
  const scale = {} as Record<Shade, string>;
  SHADES.forEach((shade, index) => {
    const stepIndex = Math.min(Math.max(index - anchorIndex + ANCHOR_500_INDEX, 0), MIX_STEPS.length - 1);
    const step = MIX_STEPS[stepIndex];
    const rgb = step >= 0 ? mix(base, 255, step) : mix(base, 0, -step);
    scale[shade] = rgb.join(" ");
  });
  return scale;
}

export function tripletToHex(triplet: string) {
  return `#${triplet
    .split(" ")
    .map((channel) => Number(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Every CSS custom property a template's tokens set on :root. */
export function tokensToCssVariables(tokens: UiTemplateTokens | null | undefined): Record<string, string> {
  const variables: Record<string, string> = {};
  if (!tokens) return variables;
  for (const key of COLOR_KEYS) {
    const hex = tokens.colors?.[key];
    if (!hex) continue;
    const family = COLOR_FAMILIES[key];
    const scale = generateScale(hex, family.anchor);
    if (!scale) continue;
    for (const palette of family.palettes) {
      for (const shade of SHADES) {
        variables[`--crm-${palette}-${shade}`] = scale[shade];
      }
    }
  }
  if (tokens.fontFamily?.trim()) {
    variables["--crm-font-sans"] = tokens.fontFamily.trim();
  }
  return variables;
}
