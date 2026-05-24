## Goal

Agar kabhi-kabhi 1-2 student ka data fix karna ho to **dobara CSV upload na karna pade**. Bas itna — simple aur out-of-the-way.

## Approach (minimal)

Step 3 (Review) mein top-right pe ek chhota **"Edit data"** button. Click karne pe ek dialog khulta hai:

```text
┌─ Edit student data ──────────────────────┐
│ [Search by name/roll…]                   │
│                                          │
│ ▸ Aarav Sharma   · Roll 12  · 8-A    [Edit] │
│ ▸ Diya Patel     · Roll 13  · 8-A    [Edit] │
│ ▸ ... (scroll)                           │
└──────────────────────────────────────────┘
```

"Edit" pe click → second view (same dialog) jisme uss row ke **saare columns** as input fields dikhte hain. Save / Cancel. Bas.

Auto-save already chal raha hai → IndexedDB mein khud save ho jayega.

### Out of scope (jaan-bujhke nahi kar rahe)
- Inline cell editing in main table
- Add / delete / duplicate rows
- Add / rename / delete columns
- CSV re-export
- Search filters in main table

Agar kabhi zarurat padi to add kar denge — abhi simple.

---

## Technical changes

### 1. Store — `src/lib/idcard-store.ts`
Ek hi naya action:
```ts
updateRow: (rowIndex: number, row: Record<string,string>) => void
```
Implementation: `rows[rowIndex]` replace + `students[rowIndex].row` bhi sync (photoId untouched).

### 2. New component — `src/components/idcard/EditDataDialog.tsx`
- Props: `open`, `onClose`
- Internal state: `selectedIndex: number | null`, `search: string`
- View 1 (list): search input + scrollable list of students (name / roll / class)
- View 2 (form): saare `headers` ka input/textarea (address jaisa lamba → textarea), Save / Back buttons
- Save → `updateRow(index, newRow)` → toast "Updated" → wapas list view

### 3. `src/components/idcard/StepReview.tsx`
- Header ke "Re-map sequentially" ke bagal mein chhota button: `<Button variant="outline" size="sm"> <Pencil/> Edit data </Button>`
- State `editOpen` + render `<EditDataDialog />`

Bas. 1 store action, 1 naya component, 1 button add. ~150 lines total.
