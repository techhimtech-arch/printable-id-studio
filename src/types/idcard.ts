export type FieldKey =
  | "name"
  | "rollNo"
  | "admissionNo"
  | "class"
  | "section"
  | "dob"
  | "bloodGroup"
  | "fatherName"
  | "motherName"
  | "address"
  | "mobile"
  | "aadharNo";

export const FIELD_LABELS: Record<FieldKey, string> = {
  name: "Name",
  rollNo: "Roll No",
  admissionNo: "Admission No",
  class: "Class",
  section: "Section",
  dob: "Date of Birth",
  bloodGroup: "Blood Group",
  fatherName: "Father's Name",
  motherName: "Mother's Name",
  address: "Address",
  mobile: "Mobile",
  aadharNo: "Aadhar No",
};

export type ColumnMapping = Partial<Record<FieldKey, string>>;

export interface PhotoFile {
  id: string;
  name: string;
  dataUrl: string;
  originalDataUrl: string;
}

export interface Student {
  id: string;
  row: Record<string, string>;
  photoId: string | null;
}

export type CardTemplate =
  | "vertical-classic"
  | "horizontal-classic"
  | "vertical-modern"
  | "horizontal-modern";

export interface CardDesign {
  template: CardTemplate;
  schoolName: string;
  schoolSubtitle: string;
  schoolAddress: string;
  contactPhone: string;
  contactEmail: string;
  principalName: string;
  logoDataUrl: string | null;
  signatureDataUrl: string | null;
  accentColor: string;
  /** Which mapped fields appear on the card body. */
  visibleFields: FieldKey[];
  orientation: "portrait" | "landscape"; // derived from template, kept for back-compat
}

export const TEMPLATE_ORIENTATION: Record<CardTemplate, "portrait" | "landscape"> = {
  "vertical-classic": "portrait",
  "vertical-modern": "portrait",
  "horizontal-classic": "landscape",
  "horizontal-modern": "landscape",
};
