import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Loader2,
  FileSpreadsheet,
  ListFilter,
  Download,
  Layers,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { api } from '@/lib/api'
import { exportCouponsToXlsx } from '@/lib/exportCsv'
import { formatShortDate } from '@/lib/format'

type DeleteTarget = { id: string; name: string }

export function CouponsPage() {
  const { generateCouponBatch, deleteCouponBatch, data, coupons, refreshData } = useApp()

  const [count, setCount] = useState<number>(100)
  const [isGeneratingCsv, setIsGeneratingCsv] = useState(false)
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null)
  const [downloadingBatchId, setDownloadingBatchId] = useState<string | null>(null)
  const [progressMsg, setProgressMsg] = useState<string>('')

  // Confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [confirmText, setConfirmText] = useState('')

  const openDeleteModal = (id: string, name: string) => {
    setDeleteTarget({ id, name })
    setConfirmText('')
  }

  const closeDeleteModal = () => {
    setDeleteTarget(null)
    setConfirmText('')
  }

  const handleDeleteBatch = async () => {
    if (!deleteTarget || confirmText !== 'DELETE') return
    const { id, name } = deleteTarget
    closeDeleteModal()
    setDeletingBatchId(id)
    try {
      await deleteCouponBatch(id)
      await refreshData()
    } catch (err: any) {
      alert('Failed to delete batch: ' + (err.message || err))
    } finally {
      setDeletingBatchId(null)
    }
  }

  // Generate & Stream directly to MongoDB, then Export Excel
  const handleGenerateAndDownloadCsv = async () => {
    if (count <= 0) return
    setIsGeneratingCsv(true)
    const perPrefix = Math.floor(count / 4)
    setProgressMsg(`Generating ${count.toLocaleString()} coupons (${perPrefix.toLocaleString()} each for A, B, C, D)...`)

    try {
      const batchName = `Coupons Batch (${count.toLocaleString()} pcs)`
      const { coupons: newCoupons } = await generateCouponBatch(count, batchName, (saved, total) => {
        const pct = Math.round((saved / total) * 100)
        setProgressMsg(`Saving to database... ${saved.toLocaleString()} / ${total.toLocaleString()} (${pct}%)`)
      })

      const fileName = `Coupons_1-${count}_(A-D).xlsx`
      exportCouponsToXlsx(newCoupons, fileName)
      setProgressMsg('Completed. Saved to database and exported as Excel.')
      setTimeout(() => setProgressMsg(''), 4000)
    } catch (err: any) {
      console.error('Excel generation error:', err)
      alert(`Error generating batch: ${err.message || 'Please check MongoDB connection'}`)
      setProgressMsg('')
    } finally {
      setIsGeneratingCsv(false)
    }
  }

  const handleDownloadBatch = async (batchId: string, batchName: string, batchCount: number) => {
    setDownloadingBatchId(batchId)
    try {
      let batchCoupons: any[] = []
      const d = await api.getBatchCoupons(batchId, Math.min(batchCount || 10000, 50000))
      if (d.ok && Array.isArray(d.coupons) && d.coupons.length > 0) {
        batchCoupons = d.coupons
      } else {
        batchCoupons = (coupons || []).filter((c) => c.batchId === batchId)
      }

      if (batchCoupons.length === 0) {
        alert('No coupons found for this batch in the database.')
        return
      }

      exportCouponsToXlsx(batchCoupons, `${batchName.replace(/\s+/g, '_')}.xlsx`)
    } catch (err: any) {
      alert('Failed to download batch: ' + (err.message || err))
    } finally {
      setDownloadingBatchId(null)
    }
  }

  const batches = data.batches || []

  return (
    <div className="mx-auto max-w-3xl space-y-6 font-sans font-light text-[#292524]">
      {/* Title & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E8E3D8] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal tracking-tight text-stone-900">
            Generate Coupons
          </h1>
        </div>

        <Link
          to="/admin/coupons-directory"
          className="inline-flex items-center justify-center gap-1.5 border border-[#E8E3D8] bg-white px-3.5 py-1.5 text-xs font-normal text-stone-700 hover:text-stone-900 hover:border-stone-400 transition rounded-[6px] shadow-2xs shrink-0"
        >
          <ListFilter size={13} />
          <span>Coupons Directory</span>
        </Link>
      </div>

      {/* Main Generator Card */}
      <div className="border border-[#E8E3D8] bg-white p-5 sm:p-6 rounded-[6px] shadow-2xs space-y-5">
        <div className="space-y-3.5">
          <label className="block text-xs font-normal text-stone-600">
            Quantity
          </label>

          {/* Preset Buttons */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {[100, 500, 1000, 5000, 10000, 50000, 100000].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCount(num)}
                className={`py-2 text-xs transition rounded-[6px] cursor-pointer ${
                  count === num
                    ? 'border border-[#1E1B18] bg-[#1E1B18] text-white font-medium shadow-2xs'
                    : 'border border-[#E8E3D8] bg-white text-stone-700 hover:bg-[#FAF8F5] font-light'
                }`}
              >
                {num >= 100000 ? '1 Lakh' : num >= 1000 ? `${num / 1000}k` : num}
              </button>
            ))}
          </div>

          {/* Custom Input */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={4}
              step={4}
              max={500000}
              value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full border border-[#E8E3D8] bg-white px-3.5 py-2 text-sm font-light text-stone-900 outline-none focus:border-[#9A7B4F] rounded-[6px]"
              placeholder="Quantity..."
            />
            <span className="text-xs text-stone-500 font-light shrink-0">coupons</span>
          </div>

          {/* Progress message */}
          {progressMsg && (
            <div className="border border-[#E8E3D8] bg-[#FAF8F5] p-3 text-xs text-stone-700 font-normal rounded-[6px] flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-[#9A7B4F]" />
              <span>{progressMsg}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={handleGenerateAndDownloadCsv}
              disabled={isGeneratingCsv || count <= 0}
              className="w-full flex items-center justify-center gap-2 border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 py-3 px-5 text-xs sm:text-sm font-normal text-white transition rounded-[6px] shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingCsv ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Processing Batch...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet size={15} className="text-[#C2A676]" />
                  <span>Generate & Export Excel ({count.toLocaleString()} Coupons)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Prepared Batches List */}
      <div className="border border-[#E8E3D8] bg-white rounded-[6px] shadow-2xs overflow-hidden">
        <div className="border-b border-[#E8E3D8] bg-[#FAF8F5] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-stone-700">
            <Layers size={13} className="text-[#9A7B4F]" />
            <span>Generated Batches</span>
            <span className="text-[11px] text-stone-400 font-light">({batches.length})</span>
          </div>
        </div>

        {batches.length > 0 ? (
          <div className="divide-y divide-[#F2EFE9]">
            {batches.map((b, idx) => {
              const totalCount = b.count || 0
              const usedInBatch = b.usedCount || 0
              const unusedInBatch = b.unusedCount ?? Math.max(0, totalCount - usedInBatch)

              return (
                <div
                  key={b.id || idx}
                  className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8F5] transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-normal text-xs text-stone-900">{b.name || `Batch #${idx + 1}`}</span>
                      <span className="font-mono text-[10px] text-stone-500 bg-[#F5F2EB] px-1.5 py-0.5 rounded-[3px] border border-[#E8E3D8]">
                        {b.id}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 font-light">
                      <span>{formatShortDate(b.createdAt)}</span>
                      <span>·</span>
                      <span>Total: <strong className="font-normal text-stone-800">{totalCount.toLocaleString()}</strong></span>
                      <span>·</span>
                      <span>{usedInBatch} registered</span>
                      <span>·</span>
                      <span>{unusedInBatch.toLocaleString()} available</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDownloadBatch(b.id, b.name || `Batch_${idx + 1}`, totalCount)}
                      disabled={downloadingBatchId === b.id}
                      className="inline-flex items-center gap-1 border border-[#E8E3D8] bg-white hover:bg-stone-50 px-2.5 py-1.5 text-xs font-normal text-stone-700 transition rounded-[6px] shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      {downloadingBatchId === b.id ? (
                        <Loader2 size={12} className="animate-spin text-stone-600" />
                      ) : (
                        <Download size={12} className="text-stone-500" />
                      )}
                      <span>Excel</span>
                    </button>

                    <button
                      onClick={() => openDeleteModal(b.id, b.name || `Batch #${idx + 1}`)}
                      disabled={deletingBatchId === b.id}
                      className="inline-flex items-center gap-1 border border-stone-200 bg-white hover:bg-red-50 hover:text-red-700 px-2 py-1.5 text-xs font-normal text-stone-400 transition rounded-[6px] shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      {deletingBatchId === b.id ? (
                        <Loader2 size={12} className="animate-spin text-red-600" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-stone-400 font-light">
            No batches generated yet.
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <div className="relative w-full max-w-md bg-white rounded-[10px] shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-[#F2EFE9]">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-50 border border-red-100">
                  <AlertTriangle size={15} className="text-red-600" />
                </span>
                <div>
                  <p className="text-sm font-medium text-stone-900">Delete Batch</p>
                  <p className="text-[11px] text-stone-500 font-light mt-0.5">This action is irreversible</p>
                </div>
              </div>
              <button onClick={closeDeleteModal} className="text-stone-400 hover:text-stone-700 transition mt-0.5 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs text-stone-600 font-light leading-relaxed">
                You are about to permanently delete&nbsp;
                <span className="font-medium text-stone-900">"{deleteTarget.name}"</span>&nbsp;
                and all its coupons. Registered participants linked to these coupons will also be removed.
              </p>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-normal text-stone-500 tracking-wide uppercase">
                  Type&nbsp;<span className="font-semibold text-red-600">DELETE</span>&nbsp;to confirm
                </label>
                <input
                  autoFocus
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDeleteBatch()}
                  placeholder="DELETE"
                  className="w-full border border-[#E8E3D8] focus:border-red-400 bg-white px-3.5 py-2 text-sm font-light text-stone-900 outline-none rounded-[6px] transition placeholder:text-stone-300"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 pb-5">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 text-xs font-normal text-stone-600 border border-[#E8E3D8] bg-white hover:bg-stone-50 rounded-[6px] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBatch}
                disabled={confirmText !== 'DELETE'}
                className="px-4 py-2 text-xs font-normal text-white bg-red-600 hover:bg-red-700 border border-red-600 rounded-[6px] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={12} />
                Delete Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
