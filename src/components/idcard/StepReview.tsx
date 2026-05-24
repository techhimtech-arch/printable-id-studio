import { useMemo, useState } from "react";
import { useIdStore } from "@/lib/idcard-store";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ArrowRight, Crop, ImageOff, Pencil, RefreshCw } from "lucide-react";
import CropDialog from "./CropDialog";
import EditDataDialog from "./EditDataDialog";

const NONE = "__none__";

export default function StepReview() {
  const { students, photos, mapping, assignPhoto, updatePhoto, setStep, buildStudents } = useIdStore();
  const [cropPhotoId, setCropPhotoId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const photoMap = useMemo(() => Object.fromEntries(photos.map((p) => [p.id, p])), [photos]);
  const assignedIds = useMemo(() => new Set(students.map((s) => s.photoId).filter(Boolean) as string[]), [students]);
  const unassigned = photos.filter((p) => !assignedIds.has(p.id));

  const cropPhoto = cropPhotoId ? photoMap[cropPhotoId] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Review & assign photos</h2>
          <p className="text-muted-foreground mt-1">
            Photos are mapped sequentially. Reassign or crop as needed.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit data
          </Button>
          <Button variant="outline" size="sm" onClick={buildStudents}>
            <RefreshCw className="h-4 w-4" /> Re-map sequentially
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_240px] gap-6">
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Photo</TableHead>
                <TableHead>{mapping.name ? "Name" : "Student"}</TableHead>
                {mapping.rollNo && <TableHead>Roll No</TableHead>}
                {mapping.class && <TableHead>Class</TableHead>}
                <TableHead className="w-[220px]">Assign</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => {
                const photo = s.photoId ? photoMap[s.photoId] : null;
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="h-10 w-10 rounded bg-muted overflow-hidden flex items-center justify-center">
                        {photo ? (
                          <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {mapping.name ? s.row[mapping.name] : "—"}
                    </TableCell>
                    {mapping.rollNo && <TableCell>{s.row[mapping.rollNo]}</TableCell>}
                    {mapping.class && <TableCell>{s.row[mapping.class]}</TableCell>}
                    <TableCell>
                      <Select
                        value={s.photoId ?? NONE}
                        onValueChange={(v) => assignPhoto(s.id, v === NONE ? null : v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="No photo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>No photo</SelectItem>
                          {photos.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {photo && (
                        <Button size="sm" variant="ghost" onClick={() => setCropPhotoId(photo.id)}>
                          <Crop className="h-3 w-3" /> Crop
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="border rounded-lg p-3 h-fit sticky top-4">
          <h3 className="text-sm font-medium mb-2">Unassigned ({unassigned.length})</h3>
          {unassigned.length === 0 ? (
            <p className="text-xs text-muted-foreground">All photos are assigned.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {unassigned.map((p) => (
                <div key={p.id} className="aspect-square rounded overflow-hidden border bg-muted" title={p.name}>
                  <img src={p.dataUrl} alt={p.name} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={() => setStep(3)}>
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <CropDialog
        open={!!cropPhoto}
        imageSrc={cropPhoto?.originalDataUrl ?? ""}
        onClose={() => setCropPhotoId(null)}
        onSave={(dataUrl) => cropPhoto && updatePhoto(cropPhoto.id, dataUrl)}
      />

      <EditDataDialog open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
