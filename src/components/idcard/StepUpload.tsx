import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { FileSpreadsheet, ImageIcon, Upload, Trash2 } from "lucide-react";
import { useIdStore } from "@/lib/idcard-store";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const fileToDataUrl = (file: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

export default function StepUpload() {
  const { headers, rows, photos, setExcel, addPhotos, removePhoto, setStep, buildStudents } = useIdStore();

  const onExcelDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      if (!json.length) {
        toast({ title: "Empty sheet", description: "No rows found in the first sheet." });
        return;
      }
      const headers = Object.keys(json[0]);
      const rows = json.map((r) => {
        const o: Record<string, string> = {};
        for (const h of headers) o[h] = String(r[h] ?? "");
        return o;
      });
      setExcel(headers, rows);
      toast({ title: "Excel loaded", description: `${rows.length} students, ${headers.length} columns.` });
    },
    [setExcel],
  );

  const onPhotosDrop = useCallback(
    async (files: File[]) => {
      const newPhotos = await Promise.all(
        files.map(async (f) => {
          const dataUrl = await fileToDataUrl(f);
          return { id: crypto.randomUUID(), name: f.name, dataUrl, originalDataUrl: dataUrl };
        }),
      );
      addPhotos(newPhotos);
    },
    [addPhotos],
  );

  const excelDz = useDropzone({
    onDrop: onExcelDrop,
    accept: { "application/vnd.ms-excel": [".xls"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "text/csv": [".csv"] },
    multiple: false,
  });

  const photoDz = useDropzone({
    onDrop: onPhotosDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    multiple: true,
  });

  const canProceed = rows.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Upload roster & photos</h2>
        <p className="text-muted-foreground mt-1">Start by uploading your student Excel file and their photos.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div
          {...excelDz.getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            excelDz.isDragActive ? "border-primary bg-accent" : "border-border hover:border-primary/50"
          }`}
        >
          <input {...excelDz.getInputProps()} />
          <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">Excel / CSV file</p>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length ? `${rows.length} rows · ${headers.length} columns loaded` : "Drag & drop, or click to select"}
          </p>
        </div>

        <div
          {...photoDz.getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            photoDz.isDragActive ? "border-primary bg-accent" : "border-border hover:border-primary/50"
          }`}
        >
          <input {...photoDz.getInputProps()} />
          <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-medium">Student photos</p>
          <p className="text-sm text-muted-foreground mt-1">
            {photos.length ? `${photos.length} photos uploaded` : "JPG / PNG, multiple allowed"}
          </p>
        </div>
      </div>

      {photos.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Uploaded photos ({photos.length})</h3>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="relative group aspect-square rounded-md overflow-hidden border bg-muted">
                <img src={p.dataUrl} alt={p.name} className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(p.id)}
                  className="absolute top-1 right-1 p-1 rounded bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          disabled={!canProceed}
          onClick={() => {
            buildStudents();
            setStep(1);
          }}
        >
          <Upload className="h-4 w-4" /> Continue to mapping
        </Button>
      </div>
    </div>
  );
}
