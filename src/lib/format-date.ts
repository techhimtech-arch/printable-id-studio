export type DateFormat =
  | "asis"
  | "dd/mm/yyyy"
  | "dd-mmm-yyyy"
  | "dd mmm yyyy"
  | "yyyy-mm-dd"
  | "mmm dd, yyyy";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Try to parse many common date strings into {y,m,d}. Returns null on failure. */
function parseLoose(input: string): { y: number; m: number; d: number } | null {
  const s = String(input || "").trim();
  if (!s) return null;

  // ISO yyyy-mm-dd or yyyy/mm/dd
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return { y: +m[1], m: +m[2], d: +m[3] };

  // dd-mm-yyyy / dd/mm/yyyy / dd.mm.yyyy
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += y < 50 ? 2000 : 1900;
    return { y, m: +m[2], d: +m[1] };
  }

  // dd Mon yyyy or dd-Mon-yyyy
  m = s.match(/^(\d{1,2})[-\s/]([A-Za-z]{3,9})[-\s/](\d{2,4})/);
  if (m) {
    const monIdx = MONTHS_SHORT.findIndex((mn) => m![2].toLowerCase().startsWith(mn.toLowerCase()));
    if (monIdx >= 0) {
      let y = +m[3];
      if (y < 100) y += y < 50 ? 2000 : 1900;
      return { y, m: monIdx + 1, d: +m[1] };
    }
  }

  // Excel serial number (days since 1899-12-30)
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    if (n > 59 && n < 60000) {
      const ms = Math.round(n) * 86400000;
      const epoch = Date.UTC(1899, 11, 30);
      const d = new Date(epoch + ms);
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
    }
  }

  // Fallback: native Date parser
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
  }
  return null;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

export function formatDate(input: string, fmt: DateFormat | undefined): string {
  if (!input) return "";
  if (!fmt || fmt === "asis") return input;
  const p = parseLoose(input);
  if (!p) return input;
  const { y, m, d } = p;
  const mon = MONTHS_SHORT[m - 1] || "";
  switch (fmt) {
    case "dd/mm/yyyy":
      return `${pad2(d)}/${pad2(m)}/${y}`;
    case "dd-mmm-yyyy":
      return `${pad2(d)}-${mon}-${y}`;
    case "dd mmm yyyy":
      return `${pad2(d)} ${mon} ${y}`;
    case "yyyy-mm-dd":
      return `${y}-${pad2(m)}-${pad2(d)}`;
    case "mmm dd, yyyy":
      return `${mon} ${pad2(d)}, ${y}`;
  }
}

export const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string; sample: string }[] = [
  { value: "asis", label: "As in CSV (no change)", sample: "—" },
  { value: "dd/mm/yyyy", label: "DD/MM/YYYY", sample: "15/08/2010" },
  { value: "dd-mmm-yyyy", label: "DD-MMM-YYYY", sample: "15-Aug-2010" },
  { value: "dd mmm yyyy", label: "DD MMM YYYY", sample: "15 Aug 2010" },
  { value: "yyyy-mm-dd", label: "YYYY-MM-DD", sample: "2010-08-15" },
  { value: "mmm dd, yyyy", label: "MMM DD, YYYY", sample: "Aug 15, 2010" },
];
