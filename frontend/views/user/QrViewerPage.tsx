import { useEffect, useState } from 'react'
import { Link } from '../../components/Link'
import QRCode from 'qrcode'
import { Download, ArrowRight, ArrowLeft, CheckCircle2, Loader2, FileText } from 'lucide-react'
import { formatCouponDisplay } from '../../lib/tokenHelper'
import { downloadA4QrPdf } from '../../lib/couponPdfGenerator'

function getInitialCouponId(initialId?: string): string {
  if (initialId) return initialId
  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search)
    const qParam = searchParams.get('coupon') || searchParams.get('id')
    if (qParam) return qParam
    const parts = window.location.pathname.split('/').filter(Boolean)
    const lastPart = parts[parts.length - 1]
    if (lastPart && lastPart !== 'qr') {
      return decodeURIComponent(lastPart)
    }
  }
  return ''
}

export function QrViewerPage({ couponId: initialCouponId }: { couponId?: string }) {
  const [couponId, setCouponId] = useState(() => getInitialCouponId(initialCouponId))
  const [isMounted, setIsMounted] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  useEffect(() => {
    setIsMounted(true)
    const detected = getInitialCouponId(initialCouponId)
    if (detected) {
      setCouponId(detected)
    }
  }, [initialCouponId])

  const cleanId = (couponId || '').trim().toUpperCase()

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.valancheryshoppingfestival.com'
  const registerUrl = `${baseUrl}/register?coupon=${cleanId}`

  useEffect(() => {
    if (!cleanId) return
    QRCode.toDataURL(registerUrl, {
      width: 600,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch(console.error)
  }, [cleanId, registerUrl])

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back()
      } else {
        window.location.href = '/'
      }
    }
  }

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  const downloadQrPng = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `coupon-qr-${cleanId}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleDownloadA4Pdf = async () => {
    if (!cleanId) return
    setIsDownloadingPdf(true)
    try {
      await downloadA4QrPdf([cleanId], `coupon-a4-sheet-${cleanId}.pdf`, {
        baseUrl,
        duplicateToFillPage: true,
      })
    } catch (e: any) {
      console.error('Error generating A4 PDF:', e)
      alert(`Failed to generate A4 PDF: ${e.message || e}`)
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  if (!cleanId && !isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f6f0] p-4 text-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#7a1426]" size={32} />
          <p className="text-xs font-semibold text-slate-600">Loading coupon QR...</p>
        </div>
      </div>
    )
  }

  if (!cleanId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f6f0] p-4 text-center">
        <div className="rounded-2xl border border-black/10 bg-white p-6 max-w-sm w-full shadow-lg space-y-4">
          <p className="text-sm font-semibold text-red-600">No coupon ID provided.</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleBack}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft size={14} />
              <span>Go Back</span>
            </button>
            <Link to="/" className="text-xs font-bold text-[#7a1426] underline">
              Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f6f0] text-slate-900 flex flex-col justify-between p-4 sm:p-6">
      <header className="mx-auto max-w-md w-full flex items-center justify-between pb-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300/80 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 hover:text-slate-900 transition"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>

        <Link to="/" className="font-display text-sm font-bold tracking-wide text-[#7a1426]">
          Valanchery <span className="text-[#c28e18]">Festival 2026</span>
        </Link>

        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 flex items-center gap-1">
          <CheckCircle2 size={12} /> Official Ticket QR
        </span>
      </header>

      <main className="mx-auto max-w-md w-full flex-1 flex flex-col justify-center">
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xl text-center space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#c28e18]">Festival Lucky Draw</span>
            <h1 className="font-display text-xl font-bold text-slate-900 mt-0.5">Coupon QR Scanner</h1>
          </div>

          {/* QR Code Container */}
          <div className="mx-auto max-w-[280px] rounded-xl border-2 border-dashed border-slate-200 bg-white p-3 shadow-inner">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR Code for ${cleanId}`} className="w-full h-auto object-contain rounded-lg" />
            ) : (
              <div className="w-[250px] h-[250px] flex items-center justify-center text-xs text-slate-400 gap-2">
                <Loader2 className="animate-spin" size={16} />
                <span>Generating QR...</span>
              </div>
            )}
          </div>

          {/* Formatted Token ID */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Coupon Token ID</p>
            <p className="font-mono text-base font-bold tracking-widest text-[#7a1426] mt-0.5">
              {formatCouponDisplay(cleanId)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Link
              to={`/register?coupon=${cleanId}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#7a1426] bg-[#7a1426] py-3 text-xs font-bold tracking-wider text-white shadow-md transition hover:bg-[#961a30]"
            >
              <span>REGISTER WITH THIS COUPON</span>
              <ArrowRight size={14} />
            </Link>

            <button
              onClick={handleDownloadA4Pdf}
              disabled={isDownloadingPdf}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-600/60 bg-amber-50/80 py-2.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 size={14} className="animate-spin text-amber-700" />
                  <span>PREPARING WHITE A4 PDF SHEET...</span>
                </>
              ) : (
                <>
                  <FileText size={14} className="text-amber-700" />
                  <span>DOWNLOAD A4 SHEET (4 QR CODES IN PDF)</span>
                </>
              )}
            </button>

            <button
              onClick={downloadQrPng}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Download size={14} />
              <span>DOWNLOAD HIGH-RES QR (PNG)</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="text-center text-[11px] text-slate-400 pt-4">
        Valanchery Festival 2026 · Official Ticket Portal
      </footer>
    </div>
  )
}
