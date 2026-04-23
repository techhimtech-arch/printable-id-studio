

## Problem

Jab visible fields zyada ho ya values lambi ho:
- **Preview templates** (4 built-in): fixed font sizes use karte hain — fields card ke neeche niche overflow karke signature/footer ke upar chadh jaate hain ya card boundary cross karte hain.
- **PDF export** mein ek hard `break` lagta hai jo extra fields silently drop kar deta hai (without user knowing).
- **Custom mode** mein elements absolute positioned hain — long text element ke bahar nikalti hai.

User chahta hai: spacing aur font auto-adjust ho taaki content card ke andar hi rahe.

## Fix plan

### 1. Auto-fit utility hook banao
Naya helper `src/lib/auto-fit.ts`:
- `computeFieldsLayout(fieldsCount, availableHeight, addressIncluded)` → returns `{ rowHeight, fontSize, labelSize, gap, maxValueLines }`.
- Logic: jitne fields zyada, utna row height aur font size proportionally chhota (clamped between min/max). Address ko 2-line se 1-line pe bhi gira sakte hain agar bahut tight ho.
- Ek dusra helper: `truncateToFit(text, maxChars)` — value lambi ho toh ellipsis.

### 2. Preview templates — auto-shrink fields area
Files:
- `src/components/idcard/templates/VerticalClassic.tsx`
- `src/components/idcard/templates/VerticalModern.tsx`
- `src/components/idcard/templates/HorizontalClassic.tsx`
- `src/components/idcard/templates/HorizontalModern.tsx`

Changes per template:
- Card ka outer `div` already fixed `width × height` use karta hai — `overflow-hidden` add karo (jaha missing hai) taaki card boundary se kuch bahar na nikle (safety net).
- Fields list ke liye `computeFieldsLayout()` call karke dynamic `fontSize`, row height, gap apply karo based on `fields.length` aur available pixel height (card height − header − photo − signature − footer).
- Address field ke liye dynamic `WebkitLineClamp` (1 ya 2 based on space).
- Long values ke liye `truncate` already lagaya hua hai — value ke liye dynamic `max-width` calculate karo.

### 3. PDF export — same auto-fit logic mirror karo
File: `src/lib/cardDraw.ts`

Har built-in template draw function (`drawVerticalClassic`, `drawHorizontalClassic`, `drawVerticalModern`, `drawHorizontalModern`):
- Loop start hone se pehle `computeFieldsLayout()` se font size + row height nikaalo (mm units mein, browser version se proportional).
- Hard `break` hata ke graceful: agar fields fit nahi hote toh font size ek aur step chhota karo, na ki silently drop.
- Result: preview aur PDF dono same density dikhayenge, aur jitne fields user ne select kiye sab visible honge.

### 4. Custom mode — element overflow guard
File: `src/components/idcard/templates/CustomTemplate.tsx` aur `src/lib/cardDraw.ts` (custom draw path):
- Har element pe `overflow: hidden` apply karo (preview mein) so text element ki value uske own `w × h` box ke bahar na jaye.
- Auto-shrink option: agar element ke andar text fit nahi ho raha toh font size step-down (preview + PDF dono mein same logic).
- Optional: CustomEditor mein "Auto-shrink text" toggle per element.

### 5. Card outer overflow safety
Sab built-in templates ke root `div` pe pakka `overflow-hidden` lage (already mostly hai, verify karenge). Isse worst case mein bhi kuch bahar nahi nikalega — text bas clip hoga.

## Files to update

- `src/lib/auto-fit.ts` — naya shared helper (font size + row height calculator)
- `src/components/idcard/templates/VerticalClassic.tsx` — dynamic fields layout
- `src/components/idcard/templates/VerticalModern.tsx` — dynamic fields layout
- `src/components/idcard/templates/HorizontalClassic.tsx` — dynamic fields layout
- `src/components/idcard/templates/HorizontalModern.tsx` — dynamic fields layout
- `src/components/idcard/templates/CustomTemplate.tsx` — element overflow + optional auto-shrink
- `src/lib/cardDraw.ts` — same auto-fit applied to all draw functions

## Result

- Jitne bhi fields select karo, sab card ke andar fit honge (font small ho jayega but drop nahi).
- Lambi values bhi clip ho jayengi, card boundary cross nahi karengi.
- Preview = PDF: dono same dikhenge.
- Custom mode mein bhi text apne box ke andar rahega.

