import { create } from "zustand";
import type { CardDesign, ColumnMapping, PhotoFile, Student } from "@/types/idcard";

interface State {
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
  setDesign: (d: Partial<CardDesign>) => void;
  reset: () => void;
}

const defaultDesign: CardDesign = {
  schoolName: "Greenwood High School",
  schoolSubtitle: "Excellence in Education",
  logoDataUrl: null,
  accentColor: "#2563eb",
  orientation: "portrait",
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
  setDesign: (d) => set({ design: { ...get().design, ...d } }),
  reset: () =>
    set({
      step: 0,
      headers: [],
      rows: [],
      mapping: {},
      photos: [],
      students: [],
      design: defaultDesign,
    }),
}));
