import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

async function getCroppedImg(src: string, area: Area): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  const size = 400;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export default function CropDialog({ open, imageSrc, onClose, onSave }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  const onComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const handleSave = async () => {
    if (!area) return;
    const out = await getCroppedImg(imageSrc, area);
    onSave(out);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crop photo</DialogTitle>
        </DialogHeader>
        <div className="relative h-72 bg-muted rounded-md overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onComplete}
            />
          )}
        </div>
        <div className="space-y-2">
          <Label>Zoom</Label>
          <Slider value={[zoom]} min={1} max={3} step={0.05} onValueChange={(v) => setZoom(v[0])} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save crop</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
