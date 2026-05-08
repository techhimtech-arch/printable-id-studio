## Goal

App ko **offline-capable + auto-save** banana — taki:
- Internet na ho tab bhi app chale (PWA, installable)
- Browser refresh / tab close hone pe bhi kaam na khoye (IndexedDB auto-save)
- Project file export/import kar sakein (cross-device backup)

## Scope

Sirf **2 cheezein** is round mein — clean aur focused:

### A. PWA (installable + offline)
### B. Auto-save with IndexedDB

Baaki advanced features (QR, double-side, etc.) baad mein.

---

## A. PWA Setup

### Files

| File | Change |
|---|---|
| `vite.config.ts` | Add `vite-plugin-pwa` with safe config |
| `index.html` | PWA meta tags (theme-color, apple-touch-icon) |
| `public/manifest.webmanifest` | App manifest |
| `public/icon-192.png`, `icon-512.png` | Generated PWA icons (ID card themed) |
| `src/main.tsx` | SW registration **guarded** — disabled in iframes/preview |
| `src/components/InstallPWA.tsx` | **New** — small "Install app" button (shows only when `beforeinstallprompt` fires) |

### Critical safety (Lovable preview ke liye)

- `devOptions: { enabled: false }` — SW sirf production mein chalega
- `registerType: "autoUpdate"` + `NetworkFirst` for HTML
- Iframe / `id-preview--*` / `lovableproject.com` host pe SW register **nahi** hoga
- Matlab: editor preview mein PWA inactive, **published URL pe active**

### User-facing

- Browser pe "Install" prompt (Chrome/Edge address bar mein bhi)
- Mobile pe "Add to Home Screen" — standalone app jaise chalega
- Offline mein cached assets se app open hoga

⚠️ **Note**: PWA features sirf published version (`printable-id-studio.lovable.app`) pe test honge, editor preview mein nahi.

---

## B. Auto-save with IndexedDB

### Why IndexedDB (not localStorage)?

- localStorage limit ~5MB → photos save hi nahi honge (ek photo 200KB+)
- IndexedDB ~50MB+ easily → 100+ photos store ho jayenge
- `idb-keyval` library (~600 bytes) — super lightweight wrapper

### Files

| File | Change |
|---|---|
| `package.json` | Add `idb-keyval` |
| `src/lib/persistence.ts` | **New** — `saveState`, `loadState`, `clearState`, `exportProject`, `importProject` |
| `src/lib/idcard-store.ts` | Subscribe to changes → debounced (500ms) IndexedDB write |
| `src/App.tsx` ya `Index.tsx` | App load pe IndexedDB se restore + toast "Previous session restored" |
| `src/components/idcard/Stepper.tsx` | "✓ Saved" indicator + "Clear saved data" option |
| `src/components/idcard/StepUpload.tsx` | "Resume previous project" card (agar saved data hai) |
| `src/components/idcard/StepExport.tsx` | "Export project (.json)" + "Import project (.json)" buttons |

### What gets saved

Sab kuch — `headers`, `rows`, `mapping`, `students`, `photos` (base64 dataURLs), `design` (with custom bg + elements), `step`.

### UX flow

1. User Excel upload karta hai → background mein auto-save
2. Tab band, kal phir khole → toast: "Previous session restored — 247 students loaded"
3. Header mein chhota indicator: `✓ Saved` (green dot)
4. Sidebar mein "Start over" already hai → ye IndexedDB bhi clear karega
5. Bonus: "Export project" se `.json` file mil jaye → dusre device pe "Import" karke same project khol sakte hain

### Storage usage indicator (chhota touch)

Stepper ke neeche: `Storage: 12 MB used` (via `navigator.storage.estimate()`)

---

## Result

- ✅ App installable (mobile + desktop)
- ✅ Offline kaam karta hai
- ✅ Refresh/crash pe data safe
- ✅ Project file backup/share kar sakte hain
- ✅ Existing flow bilkul same — sirf neeche persistence layer add hoga

## Out of scope (next round ke liye)

- QR/Barcode elements
- Double-sided cards
- Bleed/safe zone guides
- Undo/Redo

---

**Ready to build?** Implement karte hi PWA test karne ke liye published URL pe deploy karna hoga (preview mein PWA off rahega — ye intentional hai).
