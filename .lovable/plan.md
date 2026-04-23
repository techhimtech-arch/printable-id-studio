

## Problem

`VerticalClassic` template mein principal signature ka koi slot hi nahi hai. Aur jab "Customize this template" karte ho toh `templateToCustomElements()` mein bhi vertical-classic ke andar signature element generate nahi hota (sirf horizontal-classic mein hota hai). Isi wajah se signature upload karne ke baad bhi card pe nahi dikhta, aur custom mode mein bhi missing rehta hai. Saath hi `vertical-modern` aur `horizontal-modern` mein bhi signature missing hai.

Custom mode mein "+ Field" dropdown sirf un fields ko dikhata hai jo Step 2 mein mapped hain — agar koi field add nahi ho rahi toh wo mapping issue hai (separate, niche cover karunga).

## Fix plan

### 1. `VerticalClassic.tsx` mein signature + principal name footer add karo
- Footer band ke upar ek chhota signature row: right side mein signature image (height ~24px) + "Principal" label, agar `design.signatureDataUrl` ya `design.principalName` set hai.
- Layout: Fields list ke neeche `mt-auto` se push karke, footer accent band ke just upar.
- Agar dono empty hain toh kuch render mat karo (clean fallback).

### 2. `VerticalModern.tsx` aur `HorizontalModern.tsx` mein bhi same signature slot add karo
- Consistency ke liye chaaron built-in templates mein principal signature dikhe.
- Vertical-modern: footer area mein center-right.
- Horizontal-modern: bottom-right of right text panel.

### 3. `templateToCustomElements()` mein signature element add karo har template ke liye
File: `src/lib/template-to-custom.ts`
- `vertical-classic` case mein: signature shape (right-bottom, ~20×6mm) + "Principal" text label below it, footer ke just upar.
- `vertical-modern` case mein: same approach, niche center-right.
- `horizontal-modern` case mein: bottom-right corner pe signature + label.
- (`horizontal-classic` mein already hai, usko verify karunga.)

Isse jab user "Customize this template" press karega toh signature element bhi editable canvas pe aa jayega — drag/resize/delete kar sakega.

### 4. Custom editor mein "Principal name" text helper
`CustomEditor.tsx` toolbar mein "Add → Principal" quick button — ek pre-filled text element insert kare jisme `design.principalName` value ho. Ye optional convenience hai agar user manually principal label chahiye.

### 5. PDF export mein verify karo
`src/lib/cardDraw.ts` mein `vertical-classic`/`vertical-modern`/`horizontal-modern` ke draw functions mein bhi same signature drawing add karunga taaki preview aur PDF match kare. (Custom mode wala signature already supported hai PDF mein.)

### "Field add nahi ho rahi" — clarification

Custom editor ka "+ Field" dropdown sirf woh fields show karta hai jo **Step 2 (Mapping)** mein CSV column ke saath map ki gayi hain. Agar wahaan koi field map nahi ki gayi, toh dropdown khaali ya short dikhega. Fix ke saath ek hint add karunga:
- Agar `mappedFieldKeys.length === 0` ho, toh "+ Field" dropdown ke neeche chhoti note: *"No fields mapped yet — go to Step 2: Map columns to add fields."*

### Files touched

- `src/components/idcard/templates/VerticalClassic.tsx` — signature + principal label
- `src/components/idcard/templates/VerticalModern.tsx` — same
- `src/components/idcard/templates/HorizontalModern.tsx` — same
- `src/lib/template-to-custom.ts` — signature element teeno templates ke liye
- `src/lib/cardDraw.ts` — PDF mein signature draw karna teeno templates ke liye
- `src/components/idcard/CustomEditor.tsx` — "Principal" quick-add button + empty-fields hint

