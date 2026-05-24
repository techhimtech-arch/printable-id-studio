import { create } from "zustand";
import type { CardDesign, ColumnMapping, CustomElement, FieldKey, PhotoFile, Student } from "@/types/idcard";
import { TEMPLATE_ORIENTATION } from "@/types/idcard";
import { saveState, clearState, type PersistedState } from "@/lib/persistence";

interface State {
  hydrate: (s: PersistedState) => void;
  step: number;
  headers: string[];
  rows: Record<string, string>[];
  mapping: ColumnMapping;
  photos: PhotoFile[];
  students: Student[];
  design: CardDesign;
  setStep: (n: number) => void;
  setExcel: (headers: string[], rows: Record<string, string>[]) => void;
  setMapping: (m: ColumnMapping) => void;
  addPhotos: (p: PhotoFile[]) => void;
  removePhoto: (id: string) => void;
  updatePhoto: (id: string, dataUrl: string) => void;
  buildStudents: () => void;
  assignPhoto: (studentId: string, photoId: string | null) => void;
  updateRow: (rowIndex: number, row: Record<string, string>) => void;
  setDesign: (d: Partial<CardDesign>) => void;
  toggleField: (f: FieldKey) => void;
  addCustomElement: (el: CustomElement) => void;
  updateCustomElement: (id: string, patch: Partial<CustomElement>) => void;
  removeCustomElement: (id: string) => void;
  reset: () => void;
}

const defaultDesign: CardDesign = {
  template: "vertical-classic",
  schoolName: "Greenwood High School",
  schoolSubtitle: "Excellence in Education",
  schoolAddress: "123 Education Lane, Bengaluru 560001",
  contactPhone: "+91 98765 43210",
  contactEmail: "info@greenwood.edu",
  principalName: "Dr. R. K. Sharma",
  logoDataUrl: null,
  signatureDataUrl: null,
  accentColor: "#1d4ed8",
  visibleFields: ["rollNo", "class", "section", "dob", "bloodGroup", "fatherName", "mobile", "address"],
  orientation: "portrait",
  customWidth: 54,
  customHeight: 86,
  customBgDataUrl: null,
  customElements: [],
  dateFormat: "dd-mmm-yyyy",
};

export const useIdStore = create<State>((set, get) => ({
  step: 0,
  headers: [],
  rows: [],
  mapping: {},
  photos: [],
  students: [],
  design: defaultDesign,
  setStep: (n) => set({ step: n }),
  setExcel: (headers, rows) => set({ headers, rows, mapping: {}, students: [] }),
  setMapping: (mapping) => set({ mapping }),
  addPhotos: (p) => set({ photos: [...get().photos, ...p] }),
  removePhoto: (id) =>
    set({
      photos: get().photos.filter((p) => p.id !== id),
      students: get().students.map((s) => (s.photoId === id ? { ...s, photoId: null } : s)),
    }),
  updatePhoto: (id, dataUrl) =>
    set({ photos: get().photos.map((p) => (p.id === id ? { ...p, dataUrl } : p)) }),
  buildStudents: () => {
    const { rows, photos } = get();
    const students: Student[] = rows.map((row, i) => ({
      id: `s_${i}`,
      row,
      photoId: photos[i]?.id ?? null,
    }));
    set({ students });
  },
  assignPhoto: (studentId, photoId) =>
    set({
      students: get().students.map((s) => (s.id === studentId ? { ...s, photoId } : s)),
    }),
  updateRow: (rowIndex, row) => {
    const rows = get().rows.slice();
    if (rowIndex < 0 || rowIndex >= rows.length) return;
    rows[rowIndex] = row;
    const students = get().students.map((s, i) => (i === rowIndex ? { ...s, row } : s));
    set({ rows, students });
  },
  setDesign: (d) => {
    const prev = get().design;
    const next = { ...prev, ...d };
    if (d.template && d.template !== prev.template) {
      next.orientation = TEMPLATE_ORIENTATION[d.template];
      if (d.template !== "custom") {
        if (next.orientation === "portrait") {
          next.customWidth = 54;
          next.customHeight = 86;
        } else {
          next.customWidth = 86;
          next.customHeight = 54;
        }
      } else {
        next.orientation = next.customHeight >= next.customWidth ? "portrait" : "landscape";
      }
    }
    set({ design: next });
  },
  toggleField: (f) => {
    const cur = get().design.visibleFields;
    const next = cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f];
    set({ design: { ...get().design, visibleFields: next } });
  },
  addCustomElement: (el) =>
    set({ design: { ...get().design, customElements: [...get().design.customElements, el] } }),
  updateCustomElement: (id, patch) =>
    set({
      design: {
        ...get().design,
        customElements: get().design.customElements.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      },
    }),
  removeCustomElement: (id) =>
    set({
      design: { ...get().design, customElements: get().design.customElements.filter((e) => e.id !== id) },
    }),
  hydrate: (s) =>
    set({
      step: s.step,
      headers: s.headers,
      rows: s.rows,
      mapping: s.mapping,
      photos: s.photos,
      students: s.students,
      design: s.design,
    }),
  reset: () => {
    void clearState();
    set({
      step: 0,
      headers: [],
      rows: [],
      mapping: {},
      photos: [],
      students: [],
      design: defaultDesign,
    });
  },
}));

// Auto-save (debounced) — skip the very first emission so reset/hydrate don't race.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let firstEmit = true;
useIdStore.subscribe((s) => {
  if (firstEmit) {
    firstEmit = false;
    return;
  }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveState({
      step: s.step,
      headers: s.headers,
      rows: s.rows,
      mapping: s.mapping,
      photos: s.photos,
      students: s.students,
      design: s.design,
    });
    window.dispatchEvent(new CustomEvent("idcard:saved"));
  }, 600);
});

