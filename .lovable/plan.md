## Plan

### 1. Make EditDataDialog responsive + scrollable
File: `src/components/idcard/EditDataDialog.tsx`

- Change `DialogContent` className from `max-w-2xl max-h-[85vh] flex flex-col` to `w-[95vw] sm:max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden p-0`
- Distribute padding manually:
  - `DialogHeader`: add `px-4 sm:px-6 pt-4 sm:pt-6 shrink-0`
  - Search bar wrapper: `px-4 sm:px-6 shrink-0` (adjust search-icon `left` to `left-6 sm:left-8`)
  - Both `ScrollArea`: replace `-mx-6 px-6` with `flex-1 min-h-0 px-4 sm:px-6`
  - Footer (Cancel/Save bar): add `px-4 sm:px-6 pb-4 sm:pb-6 shrink-0`
- `min-h-0` on the ScrollArea is the key fix so it actually shrinks inside the flex column and the inner scrollbar appears, instead of pushing fields off-screen.

### 2. Show DOB as a real date input in the edit form
File: `src/components/idcard/EditDataDialog.tsx`

- In the form view, detect if the current header is the DOB column: `mapping.dob === h`.
- For that field, render an `<Input type="date">` instead of a text Input.
- Convert between display and storage using the existing `parseLoose` helper from `src/lib/format-date.ts`:
  - On render: parse `draft[h]` → `yyyy-mm-dd` string for the input's `value` (fallback to empty if unparseable so the user can still type).
  - On change: store the raw `yyyy-mm-dd` value back into `draft[h]`. The card preview/export already runs values through `formatDate(...)` using the design's `dateFormat`, so storing ISO is safe and consistent.
- Export `parseLoose` from `format-date.ts` (currently file-local) as a named export so the dialog can use it. Add a tiny helper `toISODate(input)` that returns `yyyy-mm-dd` or `""`.

### Technical notes
- `min-h-0` (not `min-h-1`) on the flex child is the standard fix for flex-column + overflow children.
- `max-h-[90dvh]` uses dynamic viewport units so the modal fits on mobile browsers with dynamic toolbars.
- We are NOT changing how dates are stored on disk in already-uploaded CSV rows unless the user actually edits the DOB field. Untouched rows stay as-is.

### Out of scope
- Adding a fancy popover calendar (shadcn Calendar). Native `<input type="date">` is enough for a quick edit and works on mobile.
- Re-formatting all existing DOB values in the table.