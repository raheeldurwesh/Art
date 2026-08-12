import { useState, useRef, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Crop, RotateCw, ZoomIn, Check, X } from 'lucide-react'

interface ImageCropperModalProps {
  imageSrc: string | null
  isOpen: boolean
  onClose: () => void
  onCropComplete: (croppedFile: File) => void
  aspectRatio?: number // e.g. 1 for 1:1, 3/1 for signature, 0 for free
  title?: string
  fileName?: string
}

export function ImageCropperModal({
  imageSrc,
  isOpen,
  onClose,
  onCropComplete,
  aspectRatio = 1,
  title = 'Crop Image',
  fileName = 'cropped-image.jpg',
}: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  // Reset controls when new image opens
  useEffect(() => {
    if (imageSrc && isOpen) {
      setZoom(1)
      setRotation(0)
      setPan({ x: 0, y: 0 })
      setImageLoaded(false)

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = imageSrc
      img.onload = () => {
        imgRef.current = img
        setImageLoaded(true)
      }
    }
  }, [imageSrc, isOpen])

  // Draw crop preview on canvas
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !imageLoaded) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cropWidth = 280
    const cropHeight = aspectRatio ? cropWidth / aspectRatio : cropWidth

    canvas.width = cropWidth
    canvas.height = cropHeight

    ctx.clearRect(0, 0, cropWidth, cropHeight)
    ctx.save()

    // Translate to center
    ctx.translate(cropWidth / 2 + pan.x, cropHeight / 2 + pan.y)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(zoom, zoom)

    // Draw centered
    const drawWidth = img.width
    const drawHeight = img.height

    // Scale image to fit container initially
    const scaleToFit = Math.max(cropWidth / drawWidth, cropHeight / drawHeight)
    const renderW = drawWidth * scaleToFit
    const renderH = drawHeight * scaleToFit

    ctx.drawImage(img, -renderW / 2, -renderH / 2, renderW, renderH)
    ctx.restore()
  }, [imageLoaded, zoom, rotation, pan, aspectRatio])

  useEffect(() => {
    drawPreview()
  }, [drawPreview])

  // Mouse / Pointer drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleCropSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      if (!blob) return
      const croppedFile = new File([blob], fileName, { type: 'image/jpeg' })
      onCropComplete(croppedFile)
      onClose()
    }, 'image/jpeg', 0.95)
  }

  const cropBoxWidth = 280
  const cropBoxHeight = aspectRatio ? cropBoxWidth / aspectRatio : cropBoxWidth

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md p-5 space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Crop className="h-5 w-5 text-primary" />
            <DialogTitle className="text-base">{title}</DialogTitle>
          </div>
        </DialogHeader>

        {/* Cropper Container */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div
            className="relative overflow-hidden rounded-xl border-2 border-dashed border-primary/40 bg-zinc-900 cursor-grab active:cursor-grabbing flex items-center justify-center select-none shadow-inner"
            style={{ width: cropBoxWidth, height: cropBoxHeight }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas ref={canvasRef} className="pointer-events-none rounded-lg" />
            <div className="absolute inset-0 border-2 border-primary/80 pointer-events-none rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
          </div>

          <p className="text-[11px] text-muted-foreground">
            Drag image to reposition • Use slider to zoom
          </p>

          {/* Controls */}
          <div className="w-full space-y-3 px-2">
            <div className="flex items-center gap-3">
              <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs font-mono w-8 text-right">{Math.round(zoom * 100)}%</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleRotate}
              >
                <RotateCw className="h-3.5 w-3.5" />
                Rotate 90°
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setZoom(1)
                  setRotation(0)
                  setPan({ x: 0, y: 0 })
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleCropSave} disabled={!imageLoaded}>
            <Check className="h-4 w-4 mr-1" />
            Crop & Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
