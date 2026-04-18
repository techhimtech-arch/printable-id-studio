import { useEffect, useMemo } from "react";
import { useIdStore } from "@/lib/idcard-store";
import { FIELD_LABELS, type FieldKey } from "@/types/idcard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";

const NONE = "__none__";

function guessMapping(headers: string[]): Partial<Record<FieldKey, string>> {
  const lc = headers.map((h) => h.toLowerCase());
  const find = (...keys: string[]) => {
    for (const k of keys) {
      const i = lc.findIndex((h) => h.includes(k));
      if (i >= 0) return headers[i];
    }
    return undefined;
  };
  return {
    name: find("name", "student"),
    rollNo: find("roll", "id", "admission"),
    class: find("class", "grade", "std"),
    section: find("section", "div"),
    dob: find("dob", "birth"),
    bloodGroup: find("blood"),
    fatherName: find("father", "parent", "guardian"),
    address: find("address", "addr"),
  };
}

export default function StepMapping() {
  const { headers, mapping, setMapping, setStep } = useIdStore();

  useEffect(() => {
    if (Object.keys(mapping).length === 0 && headers.length) {
      setMapping(guessMapping(headers));
    }
  }, [headers, mapping, setMapping]);

  const fields = Object.keys(FIELD_LABELS) as FieldKey[];
  const canProceed = useMemo(() => Boolean(mapping.name), [mapping]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Map columns</h2>
        <p className="text-muted-foreground mt-1">Tell us which Excel column holds each piece of info. Only Name is required.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 max-w-3xl">
        {fields.map((f) => (
          <div key={f} className="space-y-2">
            <Label>
              {FIELD_LABELS[f]} {f === "name" && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={mapping[f] ?? NONE}
              onValueChange={(v) => setMapping({ ...mapping, [f]: v === NONE ? undefined : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— None —</SelectItem>
                {headers.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(0)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button disabled={!canProceed} onClick={() => setStep(2)}>
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
