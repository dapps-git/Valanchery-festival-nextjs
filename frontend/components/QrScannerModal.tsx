import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, X, Upload, AlertCircle, RefreshCw } from 'lucide-react'
import { extractCouponId } from '../lib/tokenHelper'

interface QrScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScanSuccess: (couponId: string) => void
}

export function QrScannerModal({ isOpen, onClose, onScanSuccess }: QrScannerModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) {
      stopScanner()
      return
    }

    let isMounted = true

    const startCamera = async () => {
      setIsStarting(true)
      setError(null)
      try {
        // Small delay to ensure modal DOM element exists
        await new Promise((resolve) => setTimeout(resolve, 150))
        if (!isMounted) return

        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode('qr-reader-container')
        }

        await scannerRef.current.start(
          { facingMode },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            const extracted = extractCouponId(decodedText)
            if (extracted) {
              stopScanner()
              onScanSuccess(extracted)
              onClose()
            } else {
              setError(`Scanned QR (${decodedText.slice(0, 20)}...) does not contain a valid festival coupon code.`)
            }
          },
          () => {
            // scan failure callback (called constantly while scanning frame-by-frame)
          }
        )
      } catch (err: unknown) {
        console.error('Camera QR scan error:', err)
        if (isMounted) {
          setError('Could not access camera. Please allow camera permission or upload a photo of the QR code below.')
        }
      } finally {
        if (isMounted) {
          setIsStarting(false)
        }
      }
    }

    startCamera()

    return () => {
      isMounted = false
      stopScanner()
    }
  }, [isOpen, facingMode])

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
        await scannerRef.current.clear()
      } catch (e) {
        console.error('Error stopping scanner:', e)
      }
      scannerRef.current = null
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader-container')
      }
      const decoded = await scannerRef.current.scanFile(file, true)
      const extracted = extractCouponId(decoded)
      if (extracted) {
        await stopScanner()
        onScanSuccess(extracted)
        onClose()
      } else {
        setError('No valid festival coupon code found in the uploaded image.')
      }
    } catch {
      setError('Unable to detect QR code in this image. Please ensure the QR is clear and well-lit.')
    }
  }

  const toggleCamera = () => {
    stopScanner().then(() => {
      setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-xl border border-[#d4a017]/40 bg-[#18090f] p-4 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Camera className="text-[#f3d48a]" size={18} />
            <h3 className="font-display text-base font-normal tracking-wide text-white">Scan Coupon QR</h3>
          </div>
          <button
            onClick={() => {
              stopScanner()
              onClose()
            }}
            className="rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scanner View Area */}
        <div className="relative my-3 overflow-hidden rounded-lg border border-white/20 bg-black min-h-[260px] flex items-center justify-center">
          <div id="qr-reader-container" className="w-full h-full" />

          {isStarting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-4 text-center">
              <RefreshCw className="h-7 w-7 animate-spin text-[#f3d48a]" />
              <p className="mt-2 text-xs font-light text-white/80">Starting Camera...</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-3 flex items-start gap-2 rounded border border-red-500/30 bg-red-950/40 p-2 text-xs text-red-200">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
            <p className="text-[11px] leading-tight">{error}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleCamera}
            className="flex flex-1 items-center justify-center gap-1.5 rounded border border-white/20 bg-white/5 py-2 text-xs font-light tracking-wide text-white transition hover:bg-white/10"
          >
            <RefreshCw size={13} /> Flip Camera
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded border border-[#d4a017] bg-[#d4a017]/20 py-2 text-xs font-medium tracking-wide text-[#f3d48a] transition hover:bg-[#d4a017]/30"
          >
            <Upload size={13} /> Upload QR Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        <p className="mt-3 text-center text-[10px] text-white/50">
          Position the QR code inside the frame to scan automatically.
        </p>
      </div>
    </div>
  )
}
