import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Check, X, ZoomIn } from "lucide-react";

interface PhotoCropModalProps {
  imageSrc: string;
  onConfirm: (croppedBase64: string) => void;
  onRemove: () => void;
  onCancel: () => void;
}

const CIRCLE_SIZE = 260;

export function PhotoCropModal({ imageSrc, onConfirm, onRemove, onCancel }: PhotoCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOrigin = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  const clampOffset = useCallback((ox: number, oy: number, z: number, naturalW: number, naturalH: number) => {
    const displayW = naturalW * z;
    const displayH = naturalH * z;
    const maxX = Math.max(0, (displayW - CIRCLE_SIZE) / 2);
    const maxY = Math.max(0, (displayH - CIRCLE_SIZE) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, ox)), y: Math.min(maxY, Math.max(-maxY, oy)) };
  }, []);

  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const initial = Math.max(CIRCLE_SIZE / img.naturalWidth, CIRCLE_SIZE / img.naturalHeight);
    setMinZoom(initial);
    setZoom(initial);
    setOffset({ x: 0, y: 0 });
  };

  const handleZoomChange = (newZoom: number) => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const clamped = clampOffset(offset.x, offset.y, newZoom, img.naturalWidth, img.naturalHeight);
    setZoom(newZoom);
    setOffset(clamped);
  };

  const startDrag = (mx: number, my: number) => {
    setIsDragging(true);
    dragOrigin.current = { mx, my, ox: offset.x, oy: offset.y };
  };

  const moveDrag = (mx: number, my: number) => {
    if (!isDragging || !imgRef.current) return;
    const img = imgRef.current;
    const { mx: startMx, my: startMy, ox, oy } = dragOrigin.current;
    const newOffset = clampOffset(ox + (mx - startMx), oy + (my - startMy), zoom, img.naturalWidth, img.naturalHeight);
    setOffset(newOffset);
  };

  const stopDrag = () => setIsDragging(false);

  const handleMouseDown = (e: React.MouseEvent) => { e.preventDefault(); startDrag(e.clientX, e.clientY); };
  const handleMouseMove = (e: React.MouseEvent) => moveDrag(e.clientX, e.clientY);
  const handleTouchStart = (e: React.TouchEvent) => { startDrag(e.touches[0].clientX, e.touches[0].clientY); };
  const handleTouchMove = (e: React.TouchEvent) => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = CIRCLE_SIZE;
    canvas.height = CIRCLE_SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(CIRCLE_SIZE / 2, CIRCLE_SIZE / 2, CIRCLE_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    const drawW = img.naturalWidth * zoom;
    const drawH = img.naturalHeight * zoom;
    const drawX = CIRCLE_SIZE / 2 + offset.x - drawW / 2;
    const drawY = CIRCLE_SIZE / 2 + offset.y - drawH / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    onConfirm(canvas.toDataURL("image/jpeg", 0.92));
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Ajustar foto de perfil
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <p className="text-xs text-muted-foreground text-center">
            Arraste para posicionar · Use o controle para ampliar
          </p>

          <div
            className="relative overflow-hidden rounded-full border-4 border-primary/30 bg-muted cursor-move select-none shadow-inner"
            style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={stopDrag}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Recortar foto"
              onLoad={onImgLoad}
              draggable={false}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
                transformOrigin: "center center",
                maxWidth: "none",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
            <div className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-background/40" />
          </div>

          <div className="w-full space-y-1.5">
            <div className="flex items-center gap-2">
              <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="range"
                min={minZoom}
                max={minZoom * 3}
                step={0.01}
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="w-full accent-primary h-2 cursor-pointer"
                data-testid="input-zoom-photo"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="destructive"
            size="sm"
            onClick={onRemove}
            data-testid="button-remove-photo"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Remover foto
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            data-testid="button-cancel-crop"
          >
            <X className="mr-1.5 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            data-testid="button-confirm-crop"
          >
            <Check className="mr-1.5 h-4 w-4" />
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
