import { describe, expect, it } from "vitest";
import { COLOR_FAMILIES, SHADES, generateScale, tokensToCssVariables, tripletToHex } from "./template-tokens";
import { pageIdForPath } from "./template-pages";
import { parseTemplateFile, toTemplateFile } from "./template-transfer";

const luminance = (triplet: string) => triplet.split(" ").map(Number).reduce((sum, channel) => sum + channel, 0);

describe("generateScale", () => {
  it("puts the picked colour exactly on the family's anchor shade", () => {
    const scale = generateScale("#0284c7", "600")!;
    expect(tripletToHex(scale["600"])).toBe("#0284c7");
    expect(tripletToHex(generateScale("#0284c7", "500")!["500"])).toBe("#0284c7");
  });

  it("gets strictly darker from 50 to 950", () => {
    for (const anchor of ["500", "600"] as const) {
      const scale = generateScale("#10b981", anchor)!;
      for (let index = 1; index < SHADES.length; index++) {
        expect(luminance(scale[SHADES[index]])).toBeLessThan(luminance(scale[SHADES[index - 1]]));
      }
    }
  });

  it("rejects anything that is not #rrggbb", () => {
    expect(generateScale("red", "500")).toBeNull();
    expect(generateScale("#fff", "500")).toBeNull();
  });
});

describe("tokensToCssVariables", () => {
  it("is empty for the built-in default look", () => {
    expect(tokensToCssVariables(null)).toEqual({});
    expect(tokensToCssVariables({})).toEqual({});
  });

  it("re-skins every palette in a family and sets the font", () => {
    const variables = tokensToCssVariables({ colors: { accent: "#0284c7" }, fontFamily: " Inter, sans-serif " });
    for (const palette of COLOR_FAMILIES.accent.palettes) {
      for (const shade of SHADES) expect(variables[`--crm-${palette}-${shade}`]).toMatch(/^\d+ \d+ \d+$/);
    }
    expect(variables["--crm-indigo-600"]).toBe("2 132 199");
    expect(variables["--crm-blue-600"]).toBe("2 132 199");
    expect(variables["--crm-slate-500"]).toBeUndefined();
    expect(variables["--crm-font-sans"]).toBe("Inter, sans-serif");
  });

  it("ignores invalid colours instead of emitting broken CSS", () => {
    expect(tokensToCssVariables({ colors: { danger: "nope" } })).toEqual({});
  });
});

describe("pageIdForPath", () => {
  it("maps routes to stable page ids", () => {
    expect(pageIdForPath("/leads")).toBe("leads");
    expect(pageIdForPath("/leads/abc")).toBe("lead-workbench");
    expect(pageIdForPath("/leads/abc/dossier")).toBe("candidate-dossier");
    expect(pageIdForPath("/orders/1")).toBe("order-detail");
    expect(pageIdForPath("/ui-templates")).toBe("ui-templates");
    expect(pageIdForPath("/nowhere")).toBe("other");
  });
});

describe("template files", () => {
  it("round-trips an export", () => {
    const file = toTemplateFile({ name: "Ocean", description: null, tokens: { brandName: "Ocean HR" }, customCss: "a{}", customJs: null });
    expect(parseTemplateFile(JSON.stringify(file))).toEqual({
      name: "Ocean",
      description: null,
      tokens: { brandName: "Ocean HR" },
      customCss: "a{}",
      customJs: null
    });
  });

  it("rejects files that are not template exports", () => {
    expect(() => parseTemplateFile("not json")).toThrow(/valid JSON/);
    expect(() => parseTemplateFile(JSON.stringify({ name: "x" }))).toThrow(/export/);
    expect(() => parseTemplateFile(JSON.stringify({ format: "social-crm-ui-template", version: 99, name: "x" }))).toThrow(/newer/);
    expect(() => parseTemplateFile(JSON.stringify({ format: "social-crm-ui-template", version: 1, name: " " }))).toThrow(/name/);
    expect(() => parseTemplateFile(JSON.stringify({ format: "social-crm-ui-template", version: 1, name: "x", customJs: 5 }))).toThrow(/customJs/);
  });
});
