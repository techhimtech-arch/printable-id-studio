

## Scope (existing ko disturb nahi karunga)

`CustomEditor.tsx` mein already snap, grid, alignment guides, aur mapped-fields detection sab kuch hai. Bas 2 chhote upgrades chahiye + 1 helper text.

## Changes

### 1. `src/components/idcard/CustomEditor.tsx` — "Add all mapped fields" button

Existing "Add element toolbar" mein ek naya button:

- **"Auto-add all fields"** — ek click pe:
  - `mappedFieldKeys` (already computed) pe loop
  - Har field ke liye ek `kind: "field"` element add — left column mein neatly stacked grid mein (e.g. x=4mm, y starts at 30mm, row gap 6mm)
  - Naam pehle, bold, slightly bigger; baaki fields chhote
  - Agar `photo` mapped hai toh ek photo box bhi add (top-right area)
- Button disabled jab koi field mapped na ho, with tooltip
- Toast: "Added N fields — drag karke arrange karo"

Bahar koi state/structure change nahi — sirf existing `addElement()` ko loop mein call karega.

### 2. `src/lib/bg-eraser.ts` — naya canvas-based erase helper

Naya file with one exported function:

```ts
eraseRectsFromImage(dataUrl: string, rectsMm: {x,y,w,h}[], cardWmm, cardHmm): Promise<string>
```

- Image ko offscreen canvas pe load
- Diye gaye mm rectangles ko white (ya transparent) se fill
- Updated PNG data URL return

Pure utility — koi UI side-effect nahi.

### 3. `src/components/idcard/CustomEditor.tsx` — eraser mode UI

Existing canvas pe ek toggle add:

- Toolbar mein **"Erase"** button (next to Snap/Grid)
- Erase mode ON hone par:
  - Cursor crosshair
  - Mouse drag se canvas pe ek rectangle draw (overlay div, semi-transparent red)
  - Mouse up pe `eraseRectsFromImage()` call → naya `customBgDataUrl` set
  - Element drag/select disabled jab tak erase mode ON ho
- "Reset background" button — original BG restore karne ke liye (ek `originalBgDataUrl` ref mein store)
- Erase mode OFF karne pe normal element editing wapas

State additions: `eraseMode: boolean`, `eraseDraw: {x,y,w,h} | null`, `originalBgRef = useRef<string|null>`.

### 4. `src/components/idcard/StepDesign.tsx` — helper text

`<CustomEditor />` render hone se thoda upar (jab template === "custom") ek chhota info banner:

> 💡 **Tip:** Apni finished card design (Photoshop/Canva se exported PNG/JPG) yahan **background** ke roop mein upload karo. Phir **"Auto-add all fields"** click karo — saare mapped Excel fields ek saath aa jayenge. Drag karke jagah set karo, aur Excel ke har student ke liye PDF mein same design use hogi.

Sirf ek `<div>` block — already-existing CustomEditor invocation aur baaki kuch nahi badlega.

## Files to update

- `src/components/idcard/CustomEditor.tsx` — Auto-add button, Erase toggle + draw overlay, eraser integration
- `src/lib/bg-eraser.ts` — naya canvas-based erase utility (new file)
- `src/components/idcard/StepDesign.tsx` — chhota tip banner upar Custom editor ke

## Kya nahi karunga

- Snap-to-grid / alignment guides — already exist karte hain, dubara nahi banaunga
- Existing element types ya layout logic ko touch nahi karunga
- Excel mapping / export pipeline ko nahi chhedunga
- Built-in templates ko bilkul nahi disturb karunga

## Result

1. Background image upload karo
2. Erase tool se purane name/photo blocks white kar do (Photoshop ki zarurat nahi)
3. "Auto-add all fields" click — saare fields aa gaye
4. Drag karke jagah set karo (one-time, ~5 min)
5. Export — saare students ke cards ek hi design ke saath ban jayenge

