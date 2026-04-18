

User wants: better print-ready ID card designs, multiple templates (incl. horizontal), more fields (Aadhar, Mobile, Address, Admission No), better fonts/spacing (no overlap), decorative lines/stripes like the reference cards.

Reference 1 (Ujjawal Thakur — vertical): photo top, accent corner shape, labeled fields with bullet markers, school name footer band, contact row with phone/email icons, signature line.

Reference 2 (Anuj — horizontal): header band with logo + school name, fields list on left, photo + "IDENTITY CARD" tag on right, principal signature, decorative diagonal-stripe footer.

## Plan

### 1. Add new fields
Extend `FieldKey` in `src/types/idcard.ts` with: `admissionNo`, `aadharNo`, `mobile`. Update auto-mapping in `StepMapping.tsx` (keywords: "admission/adm", "aadhar/aadhaar", "mobile/phone/contact"). All optional.

### 2. Card templates
Add `template: "vertical-classic" | "horizontal-classic" | "vertical-modern" | "horizontal-modern"` to `CardDesign`. Add `principalName`, `schoolAddress`, `contactPhone`, `contactEmail` (used in footers). Add `signatureDataUrl` (optional).

### 3. New `StepDesign` UI
- Template picker (4 thumbnail cards, click to select)
- Orientation auto-set by template
- Existing: school name, subtitle, accent color, logo
- New inputs: principal name, school address, phone, email, signature upload (optional)
- Field visibility toggles (checkbox list) — user picks which of the mapped fields appear on the card

### 4. Rewrite `CardPreview.tsx` as a template router
Split into 4 sub-components with clean, print-ready layouts:

**VerticalClassic** (like Ujjawal ref): 54×86mm. Coloured corner shape behind photo, photo centred, name bold, fields list with small coloured square bullets, decorative dashed divider, school-name band footer, phone/email row.

**HorizontalClassic** (like Anuj ref): 86×54mm. Top band: logo + school name (white on accent). Left column: fields in "Label - Value" rows with hairline guide. Right column: photo with "IDENTITY CARD" pill, "Principal" caption below. Bottom: diagonal-stripe pattern band.

**VerticalModern**: 54×86mm. Solid accent header with school monogram, large photo ring, minimal sans fields, thin rule lines between rows.

**HorizontalModern**: 86×54mm. Left accent sidebar (25%) with rotated school name + logo, right side photo top-left + fields right, footer hairline.

### 5. Fix overlap & typography in PDF (`StepExport.tsx`)
Current issues: 3×3 grid forces 54×86mm vertical only; text wrapped manually with `maxWidth` causes clipping.

Changes:
- Compute grid based on selected template's orientation: vertical → 3 cols × 3 rows (54×86), horizontal → 2 cols × 5 rows (86×54).
- Use `doc.splitTextToSize()` for every text block, draw line-by-line so nothing overflows.
- Reserve safe zones (3mm padding inside card) — every draw call clipped to safe rect.
- Switch font to Helvetica with consistent size scale: header 8pt, name 9.5pt, labels 6pt, values 6.5pt; line-height 3.6mm.
- Render each template via a dedicated `drawVerticalClassic(doc, x, y, ...)` etc. function that mirrors the on-screen template 1:1 (so preview = print).
- Add 2mm crop marks at each card corner (light grey) for cutting after print.
- Add a top-of-document toggle in StepExport: "Include cut guides" (default on).

### 6. Decorative elements helpers
Small utility funcs in `lib/cardDraw.ts`:
- `drawDiagonalStripes(doc, x, y, w, h, color)` — angled stripe footer (matches Anuj card)
- `drawCornerAccent(doc, x, y, size, color)` — quarter-circle/pill behind photo (matches Ujjawal card)
- `drawDashedLine(doc, x1, y1, x2, y2)`
- `hexToRgb` (move here)

### 7. Preview parity
`CardPreview` (HTML/CSS) and `cardDraw` (jsPDF) share the same constants (mm dims, padding, font sizes scaled). Preview uses `transform: scale` to display at readable size.

### Files touched
- `src/types/idcard.ts` — new fields, new design props, template enum
- `src/lib/idcard-store.ts` — defaults for new design fields, default template
- `src/lib/cardDraw.ts` — NEW, all jsPDF drawing helpers + 4 template renderers
- `src/components/idcard/StepMapping.tsx` — auto-map new fields
- `src/components/idcard/StepDesign.tsx` — template picker, new inputs, field toggles
- `src/components/idcard/CardPreview.tsx` — router → 4 template components
- `src/components/idcard/templates/*.tsx` — NEW, 4 HTML templates
- `src/components/idcard/StepExport.tsx` — orientation-aware grid, call cardDraw, cut guides

<lov-actions>
<lov-suggestion message="Approved — implement the templates, new fields, and PDF overlap fixes as planned.">Approve & build</lov-suggestion>
<lov-suggestion message="Just add the horizontal template and fix the overlap issues for now — skip the 4-template picker.">Smaller scope: 1 horizontal + fixes</lov-suggestion>
<lov-suggestion message="Add a QR code on each card encoding the student's roll number and name.">Add QR codes too</lov-suggestion>
<lov-suggestion message="Add a back side for each ID card with school address, rules, and emergency contact.">Add card back side</lov-suggestion>
</lov-actions>
