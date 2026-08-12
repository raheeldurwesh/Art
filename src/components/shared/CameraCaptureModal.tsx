import { useState, useRef, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Camera, SwitchCamera, X, Check } from 'lucide-react'
import { toast } from 'sonner'

interface CameraCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (imageDataUrl: string) => void
}

export function CameraCaptureModal({ isOpen, onClose, onCapture }: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  // Start camera stream when modal opens
  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    setIsStarting(true)
    setCameraError(null)

    // Stop existing stream if any
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(newStream)

      if (videoRef.current) {
        videoRef.current.srcObject = newStream
        await videoRef.current.play()
      }

      // Check available camera devices
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((device) => device.kind === 'videoinput')
      setHasMultipleCameras(videoDevices.length > 1)
    } catch (err) {
      console.error('Camera access error:', err)
      setCameraError('Camera access denied or not available. Please allow camera permissions.')
    } finally {
      setIsStarting(false)
    }
  }, [stream])

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode)
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isOpen, facingMode])

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(nextMode)
  }

  const handleSnap = () => {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Flip horizontally if front camera for natural mirror effect
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)

    stopCamera()
    onCapture(dataUrl)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md p-5 space-y-4">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <DialogTitle className="text-base">Capture Student Photo</DialogTitle>
            </div>
            {hasMultipleCameras && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={toggleFacingMode}
                title="Switch Camera"
              >
                <SwitchCamera className="h-3.5 w-3.5" />
                Flip
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-border shadow-inner">
          {cameraError ? (
            <div className="p-6 text-center text-sm text-red-400 space-y-2">
              <p>{cameraError}</p>
              <Button variant="outline" size="sm" onClick={() => startCamera(facingMode)}>
                Retry Camera
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              {isStarting && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Starting Camera...
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-[11px] text-center text-muted-foreground">
          Center student in the frame and click <strong>Take Photo</strong>
        </p>

        <DialogFooter className="flex gap-2 sm:justify-between items-center pt-1">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5"
            onClick={handleSnap}
            disabled={!stream || isStarting || Boolean(cameraError)}
          >
            <Camera className="h-4 w-4" />
            Take Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
