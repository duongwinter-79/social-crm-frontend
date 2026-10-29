import { describe, expect, it } from "vitest";
import {
  contactChannelLabel,
  parseWholeNumber,
  readEducation,
  readEnglish,
  readHand,
  readMarital,
  readVision,
  readWorkRows,
  readYesNoText,
  visionLegacyDetail,
  writeEnglish
} from "./form-chuan-values";

describe("FORM CHUẨN value readers", () => {
  it("reads legacy free-text declarations as the form's yes / no", () => {
    expect(readYesNoText("không xăm")).toEqual({ answer: "no", detail: "" });
    expect(readYesNoText("K xăm")).toEqual({ answer: "no", detail: "" });
    expect(readYesNoText("Có")).toEqual({ answer: "yes", detail: "" });
    expect(readYesNoText("mổ ruột thừa 2019")).toEqual({ answer: "yes", detail: "mổ ruột thừa 2019" });
    expect(readYesNoText(undefined)).toEqual({ answer: null, detail: "" });
  });

  it("maps AI / older-form wording onto the paper options", () => {
    expect(readMarital("đã kết hôn")).toBe("Kết hôn");
    expect(readMarital("Độc thân")).toBe("Chưa kết hôn");
    expect(readMarital("ly hôn")).toBe("Ly hôn");
    expect(readVision("cận 2 độ")).toBe("Cận");
    expect(readVision("10/10")).toBe("Bình thường");
    expect(readEducation("12/12 (đại học điện lực Hà Nội)")).toBe("Đại học");
    expect(readEducation("cấp 3")).toBe("THPT");
    expect(readHand("phải")).toBe("Phải");
  });

  it("keeps a legacy vision detail, but not a bare option label", () => {
    expect(visionLegacyDetail("cận 2 độ")).toBe("cận 2 độ");
    expect(visionLegacyDetail("Cận")).toBe("");
    expect(visionLegacyDetail(null)).toBe("");
  });

  it("writes the English level without touching other languages", () => {
    const langs = ["Tiếng Trung: nghe nói cơ bản", "Tiếng Anh: không"];
    expect(readEnglish(langs)).toBe("Không biết");
    const next = writeEnglish(langs, "Hiểu đơn giản");
    expect(next).toEqual(["Tiếng Trung: nghe nói cơ bản", "Tiếng Anh: Hiểu đơn giản"]);
    expect(readEnglish(next)).toBe("Hiểu đơn giản");
    expect(writeEnglish(undefined, "Không biết")).toEqual(["Tiếng Anh: Không biết"]);
  });

  it("reads the work table defensively", () => {
    expect(readWorkRows([{ occupation: "CNC", company: "Hanwha", period: 2021 }, "junk", null])).toEqual([
      { occupation: "CNC", location: "", company: "Hanwha", description: "", period: "2021" }
    ]);
    expect(readWorkRows(undefined)).toEqual([]);
  });

  it("parses whole numbers and treats blank as a clear", () => {
    expect(parseWholeNumber("58")).toBe(58);
    expect(parseWholeNumber(" ")).toBeNull();
    expect(parseWholeNumber("5a")).toBeUndefined();
  });

  it("labels the contact channel like the printed form", () => {
    expect(contactChannelLabel("website")).toBe("Website");
    expect(contactChannelLabel("zalo")).toBe("Mạng XH");
    expect(contactChannelLabel("gioi_thieu")).toBe("Khác");
    expect(contactChannelLabel(null)).toBe("");
  });
});
