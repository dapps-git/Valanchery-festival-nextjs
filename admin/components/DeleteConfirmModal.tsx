import { useState, useEffect, type ReactNode } from 'react'
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react'

interface DeleteConfirmModalProps {
  isOpen: boolean
  title: string
  itemName: string
  itemType?: string // e.g. "Coupon Batch", "Participant", "Prize", "Lucky Draw"
  warningDetails?: ReactNode
  onClose: () => void
  onConfirm: () => Promise<void> | void
  isDeleting?: boolean
}

export function DeleteConfirmModal({
  isOpen,
  title,
  itemName,
  itemType = 'item',
  warningDetails,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteConfirmModalProps) {
  const [inputText, setInputText] = useState('')
  const [step, setStep] = useState<1 | 2>(1)

  useEffect(() => {
    if (isOpen) {
      setInputText('')
      setStep(1)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleInitialConfirm = () => {
    if (inputText.trim() !== 'DELETE') return
    // Proceed to Step 2 for double confirmation
    setStep(2)
  }

  const handleFinalConfirm = async () => {
    // Secondary browser confirmation guard
    const confirmed = window.confirm(
      `FINAL CONFIRMATION:\n\nAre you ABSOLUTELY certain you want to permanently delete this ${itemType}?\n\n"${itemName}"\n\nThis action is permanent and cannot be undone.`
    )
    if (!confirmed) return
    await onConfirm()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(5px)', backgroundColor: 'rgba(0,0,0,0.55)' }}
    >
      <div className="relative w-full max-w-md bg-white rounded-[10px] shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-[#F2EFE9] bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 border border-red-200 text-red-600">
              <AlertTriangle size={16} />
            </span>
            <div>
              <p className="text-sm font-medium text-stone-900">{title}</p>
              <p className="text-[11px] text-stone-500 font-light mt-0.5">Permanent & Irreversible Action</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-stone-400 hover:text-stone-700 transition mt-0.5 cursor-pointer disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="border border-red-200 bg-red-50/70 p-3 rounded-[6px] text-xs text-red-800 leading-relaxed font-light">
            <strong className="font-semibold block mb-0.5 text-red-900">Safety Warning:</strong>
            {warningDetails || (
              <>
                You are about to permanently delete{' '}
                <strong className="font-medium text-red-950">"{itemName}"</strong>.
                If this data has been printed or distributed, it will immediately become invalid!
              </>
            )}
          </div>

          {step === 1 ? (
            <div className="space-y-2">
              <label className="block text-[11px] font-normal text-stone-600 tracking-wide uppercase">
                Type <span className="font-bold text-red-600">DELETE</span> in capital letters to unlock:
              </label>
              <input
                autoFocus
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInitialConfirm()}
                placeholder="DELETE"
                disabled={isDeleting}
                className="w-full border border-stone-300 focus:border-red-500 bg-white px-3.5 py-2 font-mono text-sm font-normal text-stone-900 outline-none rounded-[6px] transition placeholder:text-stone-300"
              />
            </div>
          ) : (
            <div className="border border-amber-200 bg-amber-50 p-3.5 rounded-[6px] space-y-2 animate-in fade-in">
              <p className="text-xs font-medium text-amber-900">
                Are you 100% sure you want to proceed?
              </p>
              <p className="text-[11px] text-amber-800 font-light leading-normal">
                Click below to finalize the permanent deletion of <strong>"{itemName}"</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 pb-5 pt-2 border-t border-[#F2EFE9] bg-stone-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-normal text-stone-600 border border-[#E8E3D8] bg-white hover:bg-stone-50 rounded-[6px] transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          {step === 1 ? (
            <button
              type="button"
              onClick={handleInitialConfirm}
              disabled={inputText.trim() !== 'DELETE' || isDeleting}
              className="px-4 py-2 text-xs font-normal text-white bg-red-600 hover:bg-red-700 border border-red-600 rounded-[6px] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalConfirm}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-medium text-white bg-red-700 hover:bg-red-800 border border-red-700 rounded-[6px] transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={13} />
                  <span>Confirm Permanent Delete</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
