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
  | "horizontal-modern"
  | "custom";

export type CustomElementKind = "photo" | "field" | "text" | "logo" | "signature";

/** All positions/sizes are in millimetres, relative to card top-left. */
export interface CustomElement {
  id: string;
  kind: CustomElementKind;
  /** For kind="field": the FieldKey or "name". */
  field?: FieldKey;
  /** For kind="text": static label text (e.g. "ID CARD"). */
  text?: string;
  /** For kind="field": prefix shown before value (e.g. "Roll No: "). */
  labelPrefix?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number; // pt
  fontFamily: "helvetica" | "times" | "courier";
  bold: boolean;
  italic: boolean;
  color: string; // hex
  align: "left" | "center" | "right";
}

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
  /** Custom card width / height in millimetres (used by template="custom"). */
  customWidth: number;
  customHeight: number;
  /** Background image (Photoshop/Canva design). */
  customBgDataUrl: string | null;
  /** Draggable elements rendered over the background. */
  customElements: CustomElement[];
}

export const TEMPLATE_ORIENTATION: Record<CardTemplate, "portrait" | "landscape"> = {
  "vertical-classic": "portrait",
  "vertical-modern": "portrait",
  "horizontal-classic": "landscape",
  "horizontal-modern": "landscape",
  custom: "portrait",
};
