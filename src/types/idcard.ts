export type FieldKey = "name" | "rollNo" | "class" | "section" | "dob" | "bloodGroup" | "fatherName" | "address";

export const FIELD_LABELS: Record<FieldKey, string> = {
  name: "Name",
  rollNo: "Roll No",
  class: "Class",
  section: "Section",
  dob: "Date of Birth",
  bloodGroup: "Blood Group",
  fatherName: "Father's Name",
  address: "Address",
};

export type ColumnMapping = Partial<Record<FieldKey, string>>;

export interface PhotoFile {
  id: string;
  name: string;
  dataUrl: string; // possibly cropped
  originalDataUrl: string;
}

export interface Student {
  id: string;
  row: Record<string, string>;
  photoId: string | null;
}

export interface CardDesign {
  schoolName: string;
  schoolSubtitle: string;
  logoDataUrl: string | null;
  accentColor: string; // hex
  orientation: "portrait" | "landscape";
}
