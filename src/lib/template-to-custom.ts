import type { CardDesign, CustomElement, FieldKey } from "@/types/idcard";
import { FIELD_LABELS } from "@/types/idcard";

let counter = 0;
const id = () => `el_${Date.now()}_${counter++}`;

function makeText(text: string, x: number, y: number, w: number, h: number, opts: Partial<CustomElement> = {}): CustomElement {
  return {
    id: id(),
    kind: "text",
    text,
    x, y, w, h,
    fontSize: 9,
    fontFamily: "helvetica",
    bold: false,
    italic: false,
    color: "#111111",
    align: "left",
    ...opts,
  };
}

function makeField(field: FieldKey | "name", x: number, y: number, w: number, h: number, opts: Partial<CustomElement> = {}): CustomElement {
  return {
    id: id(),
    kind: "field",
    field: field as FieldKey,
    labelPrefix: opts.labelPrefix ?? (field === "name" ? "" : `${FIELD_LABELS[field as FieldKey]}: `),
    x, y, w, h,
    fontSize: 8,
    fontFamily: "helvetica",
    bold: false,
    italic: false,
    color: "#111111",
    align: "left",
    ...opts,
  };
}

function makeShape(kind: "photo" | "logo" | "signature", x: number, y: number, w: number, h: number): CustomElement {
  return {
    id: id(),
    kind,
    x, y, w, h,
    fontSize: 9,
    fontFamily: "helvetica",
    bold: false,
    italic: false,
    color: "#111111",
    align: "left",
  };
}

/**
 * Convert a built-in template's layout into a list of CustomElements
 * positioned in millimeters, mirroring the rendered design.
 */
export function templateToCustomElements(design: CardDesign): CustomElement[] {
  const W = design.customWidth;
  const H = design.customHeight;
  const accent = design.accentColor;
  const fields = design.visibleFields.filter((f) => f !== "name");

  const els: CustomElement[] = [];

  switch (design.template) {
    case "vertical-classic": {
      // Header: logo + school name (top ~10mm)
      els.push(makeShape("logo", 2, 2, 8, 8));
      els.push(makeText(design.schoolName, 11, 2, W - 13, 5, {
        fontSize: 8, bold: true, align: "left",
      }));
      els.push(makeText(design.schoolSubtitle || "", 11, 7, W - 13, 3, {
        fontSize: 5.5, color: "#666666",
      }));

      // Photo centered
      const photoW = 24, photoH = 28;
      const photoX = (W - photoW) / 2;
      els.push(makeShape("photo", photoX, 13, photoW, photoH));

      // Name
      els.push(makeField("name", 2, 43, W - 4, 5, {
        fontSize: 10, bold: true, align: "center", labelPrefix: "",
      }));

      // Fields
      let y = 50;
      fields.forEach((f) => {
        els.push(makeField(f, 3, y, W - 6, 3.5, { fontSize: 6.5 }));
        y += 4;
      });

      // Signature (right-bottom, just above footer)
      els.push(makeShape("signature", W - 22, H - 12, 20, 6));
      els.push(makeText(design.principalName || "Principal", W - 22, H - 6, 20, 3, {
        fontSize: 5, align: "center", color: "#666666",
      }));

      // Footer contact
      els.push(makeText(
        [design.contactPhone, design.contactEmail].filter(Boolean).join("  ·  "),
        2, H - 4, W - 4, 3,
        { fontSize: 5.5, align: "center", color: accent },
      ));
      break;
    }

    case "vertical-modern": {
      // Header band area
      els.push(makeShape("logo", (W - 8) / 2, 2, 8, 8));
      els.push(makeText(design.schoolName, 2, 11, W - 4, 4, {
        fontSize: 8, bold: true, align: "center", color: accent,
      }));
      els.push(makeText(design.schoolSubtitle || "", 2, 15, W - 4, 3, {
        fontSize: 5.5, align: "center", color: "#666666",
      }));
      els.push(makeText("STUDENT ID", 2, 18.5, W - 4, 3, {
        fontSize: 5, align: "center", color: accent, bold: true,
      }));

      const photoW = 26, photoH = 26;
      els.push(makeShape("photo", (W - photoW) / 2, 23, photoW, photoH));

      els.push(makeField("name", 2, 51, W - 4, 5, {
        fontSize: 10, bold: true, align: "center", labelPrefix: "",
      }));

      let y = 58;
      fields.forEach((f) => {
        els.push(makeField(f, 3, y, W - 6, 3.5, { fontSize: 6.5 }));
        y += 4;
      // Signature near bottom-center-right
      els.push(makeShape("signature", W - 24, H - 10, 22, 6));
      els.push(makeText(design.principalName || "Principal", W - 24, H - 4, 22, 3, {
        fontSize: 5, align: "center", color: "#666666",
      }));
      break;
    }
      // Header band (top ~11mm)
      els.push(makeShape("logo", 2, 2, 7, 7));
      els.push(makeText(design.schoolName, 10, 2, W - 12, 4, {
        fontSize: 9, bold: true, color: accent,
      }));
      els.push(makeText(design.schoolSubtitle || "", 10, 6.5, W - 12, 3, {
        fontSize: 5.5, color: "#666666",
      }));

      // Photo right side
      const photoW = 22, photoH = 26;
      const photoX = W - photoW - 3;
      els.push(makeShape("photo", photoX, 13, photoW, photoH));

      // Name + fields left
      els.push(makeField("name", 3, 13, photoX - 5, 5, {
        fontSize: 10, bold: true, color: accent, labelPrefix: "",
      }));

      let y = 19;
      fields.forEach((f) => {
        els.push(makeField(f, 3, y, photoX - 5, 3.5, { fontSize: 6.5 }));
        y += 4;
      });

      // Signature
      els.push(makeShape("signature", photoX, photoH + 14, photoW, 5));
      els.push(makeText("Principal", photoX, photoH + 19.5, photoW, 3, {
        fontSize: 5, align: "center", color: "#666666",
      }));
      break;
    }

    case "horizontal-modern": {
      // Sidebar area (left ~20mm)
      const sidebarW = 22;
      els.push(makeShape("logo", (sidebarW - 10) / 2, 5, 10, 10));
      els.push(makeText(design.schoolName, 1, 18, sidebarW - 2, 6, {
        fontSize: 6.5, bold: true, align: "center", color: accent,
      }));
      els.push(makeText("ID CARD", 1, H - 5, sidebarW - 2, 3, {
        fontSize: 5, align: "center", color: accent,
      }));

      // Photo
      const photoW = 20, photoH = 24;
      els.push(makeShape("photo", sidebarW + 3, 4, photoW, photoH));

      // Name + fields
      const textX = sidebarW + photoW + 5;
      const textW = W - textX - 2;
      els.push(makeField("name", textX, 4, textW, 5, {
        fontSize: 11, bold: true, labelPrefix: "",
      }));
      els.push(makeText("STUDENT", textX, 9, textW, 3, {
        fontSize: 5.5, color: accent, bold: true,
      }));

      let y = 13;
      fields.forEach((f) => {
        els.push(makeField(f, textX, y, textW, 3.5, { fontSize: 6.5 }));
        y += 4;
      });
      break;
    }
  }

  return els;
}
