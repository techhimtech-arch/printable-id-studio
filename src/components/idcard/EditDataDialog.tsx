import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Pencil, Search } from "lucide-react";
import { useIdStore } from "@/lib/idcard-store";
import { parseLoose } from "@/lib/format-date";
import { toast } from "sonner";

const pad2 = (n: number) => String(n).padStart(2, "0");
const toISODate = (input: string): string => {
  const p = parseLoose(input);
  return p ? `${p.y}-${pad2(p.m)}-${pad2(p.d)}` : "";
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function EditDataDialog({ open, onClose }: Props) {
  const { rows, headers, mapping, updateRow } = useIdStore();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setSelectedIndex(null);
      setSearch("");
    }
  }, [open]);

  useEffect(() => {
    if (selectedIndex !== null && rows[selectedIndex]) {
      setDraft({ ...rows[selectedIndex] });
    }
  }, [selectedIndex, rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.map((r, i) => ({ row: r, i }));
    if (!q) return list;
    return list.filter(({ row }) =>
      Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const handleSave = () => {
    if (selectedIndex === null) return;
    updateRow(selectedIndex, draft);
    toast.success("Updated");
    setSelectedIndex(null);
  };

  const labelFor = (h: string) => {
    const entry = Object.entries(mapping).find(([, v]) => v === h);
    return entry ? `${h} (${entry[0]})` : h;
  };

  const isLongField = (h: string) => {
    if (mapping.address === h) return true;
    return String(draft[h] ?? "").length > 60;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedIndex !== null && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSelectedIndex(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {selectedIndex === null ? "Edit student data" : "Edit row"}
          </DialogTitle>
        </DialogHeader>

        {selectedIndex === null ? (
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, roll, anything…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-1 py-2">
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground py-8 text-center">No matches.</p>
                )}
                {filtered.map(({ row, i }) => {
                  const name = mapping.name ? row[mapping.name] : `Row ${i + 1}`;
                  const roll = mapping.rollNo ? row[mapping.rollNo] : "";
                  const klass = mapping.class ? row[mapping.class] : "";
                  const section = mapping.section ? row[mapping.section] : "";
                  const meta = [roll && `Roll ${roll}`, [klass, section].filter(Boolean).join("-")]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedIndex(i)}
                      className="w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-muted transition"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{name || `Row ${i + 1}`}</div>
                        {meta && <div className="text-xs text-muted-foreground truncate">{meta}</div>}
                      </div>
                      <Pencil className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-3 py-2">
                {headers.map((h) => (
                  <div key={h} className="space-y-1.5">
                    <Label className="text-xs">{labelFor(h)}</Label>
                    {isLongField(h) ? (
                      <Textarea
                        value={draft[h] ?? ""}
                        onChange={(e) => setDraft({ ...draft, [h]: e.target.value })}
                        rows={2}
                      />
                    ) : (
                      <Input
                        value={draft[h] ?? ""}
                        onChange={(e) => setDraft({ ...draft, [h]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setSelectedIndex(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
