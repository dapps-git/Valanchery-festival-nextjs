import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { GIFT_PRESETS } from '@/data/mockData'
import type { Prize } from '@/types'
import { Plus, X, Edit3, Trash2, Upload, Sparkles, Loader2, CheckCircle2 } from 'lucide-react'

export function PrizesPage() {
  const { data, addPrize, updatePrize, deletePrize } = useApp()
  const navigate = useNavigate()
  const [edit, setEdit] = useState<Partial<Prize> | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadError('')
    setUploadSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()
      if (json.ok && json.url) {
        setEdit((prev) => (prev ? { ...prev, image: json.url } : null))
        setUploadSuccess('Uploaded to Cloudinary!')
        setTimeout(() => setUploadSuccess(''), 3000)
      } else {
        throw new Error(json.error || 'Failed to upload to Cloudinary')
      }
    } catch (err: any) {
      console.warn('Cloudinary upload issue, using local file reader:', err)
      // Fallback to FileReader Data URL so the user is never stuck
      const reader = new FileReader()
      reader.onload = (evt) => {
        const resUrl = evt.target?.result as string
        if (resUrl) {
          setEdit((prev) => (prev ? { ...prev, image: resUrl } : null))
          setUploadSuccess('Image loaded')
          setTimeout(() => setUploadSuccess(''), 3000)
        }
      }
      reader.readAsDataURL(file)
    } finally {
      setIsUploading(false)
    }
  }

  const save = () => {
    if (!edit?.name?.trim()) return
    if (edit.id) {
      updatePrize(edit.id, {
        name: edit.name.trim(),
        description: edit.description?.trim() ?? '',
        value: edit.value?.trim() || '₹0',
        image: edit.image || GIFT_PRESETS[0].image,
      })
    } else {
      addPrize({
        name: edit.name.trim(),
        description: edit.description?.trim() ?? '',
        value: edit.value?.trim() || '₹0',
        image: edit.image || GIFT_PRESETS[0].image,
        assignedDrawId: null,
        status: 'Available',
      })
    }
    setEdit(null)
  }

  return (
    <div className="space-y-6 font-sans font-light text-[#292524]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E8E3D8] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal tracking-tight text-stone-900">
            Festival Gifts
          </h1>
          <p className="mt-0.5 text-xs text-stone-500 font-light">
            Upload and manage gifts for lucky draw entrants.
          </p>
        </div>

        <button
          onClick={() =>
            setEdit({
              name: '',
              description: '',
              value: '',
              image: GIFT_PRESETS[0].image,
              status: 'Available',
            })
          }
          className="inline-flex items-center gap-1.5 border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 px-4 py-2 text-xs font-normal text-white rounded-[6px] shadow-2xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus size={13} />
          <span>Add New Gift</span>
        </button>
      </div>

      {/* Grid of Gifts */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.prizes.map((p) => {
          return (
            <article
              key={p.id}
              className="border border-[#E8E3D8] bg-white rounded-[6px] shadow-2xs hover:shadow-xs transition duration-200 flex flex-col overflow-hidden"
            >
              {/* Prize Image */}
              <div className="relative h-48 w-full overflow-hidden bg-[#FAF8F5]">
                <img
                  src={p.image}
                  alt={p.name}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                {/* Value Pill Top Right */}
                <div className="absolute top-3 right-3 rounded-[4px] bg-white/95 backdrop-blur-xs border border-[#E8E3D8] px-2.5 py-0.5 text-xs font-mono text-stone-900 shadow-2xs">
                  {p.value || 'Special Gift'}
                </div>
              </div>

              {/* Card Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h2 className="text-sm font-normal text-stone-900 truncate">
                    {p.name}
                  </h2>
                  <p className="mt-1 text-xs text-stone-500 font-light line-clamp-2">
                    {p.description || 'Valanchery Festival official prize'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-[#F2EFE9] pt-3">
                  <button
                    onClick={() => navigate(`/admin/lucky-draw?giftId=${p.id}`)}
                    className="inline-flex items-center gap-1.5 text-xs font-normal text-stone-900 hover:text-[#9A7B4F] transition"
                  >
                    <Sparkles size={12} className="text-[#C2A676]" />
                    <span>Spin in Live Draw</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEdit(p)}
                      className="inline-flex items-center gap-1 border border-[#E8E3D8] bg-white hover:bg-[#FAF8F5] px-2.5 py-1 text-xs font-normal text-stone-700 rounded-[4px] transition cursor-pointer"
                    >
                      <Edit3 size={11} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${p.name}"?`)) {
                          deletePrize(p.id)
                        }
                      }}
                      className="inline-flex items-center gap-1 border border-stone-200 bg-white hover:bg-red-50 hover:text-red-700 text-stone-400 px-2.5 py-1 text-xs font-normal rounded-[4px] transition cursor-pointer"
                    >
                      <Trash2 size={11} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {data.prizes.length === 0 && (
        <div className="border border-[#E8E3D8] bg-white p-12 text-center rounded-[6px] shadow-2xs space-y-3">
          <p className="text-xs text-stone-400 font-light">No gifts in the vault yet.</p>
          <button
            onClick={() =>
              setEdit({
                name: '',
                description: '',
                value: '',
                image: GIFT_PRESETS[0].image,
                status: 'Available',
              })
            }
            className="inline-flex items-center gap-1 border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 px-3.5 py-1.5 text-xs font-normal text-white rounded-[6px] transition cursor-pointer"
          >
            <Plus size={13} />
            <span>Add First Gift</span>
          </button>
        </div>
      )}

      {/* Edit / Add Modal */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-auto border border-[#E8E3D8] bg-white p-5 sm:p-6 rounded-[6px] shadow-lg">
            <div className="flex items-center justify-between border-b border-[#E8E3D8] pb-3">
              <h3 className="text-sm font-normal text-stone-900">
                {edit.id ? 'Edit Gift' : 'Add New Gift'}
              </h3>
              <button
                onClick={() => setEdit(null)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs font-light">
              <div>
                <label className="block text-xs font-normal text-stone-600">
                  Gift Name *
                </label>
                <input
                  className="mt-1 w-full border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-[#9A7B4F] rounded-[4px]"
                  placeholder="e.g. Smart 4K TV, Refrigerator, Gold Coin"
                  value={edit.name ?? ''}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-stone-600">
                  Description <span className="text-stone-400">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  className="mt-1 w-full border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-[#9A7B4F] rounded-[4px]"
                  placeholder="Additional details about the prize"
                  value={edit.description ?? ''}
                  onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-stone-600">
                  Prize Value <span className="text-stone-400">(optional)</span>
                </label>
                <input
                  className="mt-1 w-full border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-[#9A7B4F] rounded-[4px]"
                  placeholder="e.g. ₹42,000"
                  value={edit.value ?? ''}
                  onChange={(e) => setEdit({ ...edit, value: e.target.value })}
                />
              </div>

              {/* Cloudinary Image Upload */}
              <div>
                <label className="block text-xs font-normal text-stone-600 mb-1">
                  Prize Image
                </label>

                <div className="border border-dashed border-[#E8E3D8] bg-[#FAF8F5] p-3.5 text-center rounded-[6px]">
                  <input
                    type="file"
                    id="prize-image-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />

                  {isUploading ? (
                    <div className="flex flex-col items-center justify-center py-4 space-y-2">
                      <Loader2 size={18} className="animate-spin text-[#9A7B4F]" />
                      <p className="text-xs text-stone-600 font-light">Uploading to Cloudinary...</p>
                    </div>
                  ) : edit.image ? (
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="h-18 w-28 shrink-0 overflow-hidden border border-[#E8E3D8] bg-white rounded-[4px]">
                        <img src={edit.image} alt="Preview" className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 text-left space-y-1">
                        <p className="text-xs font-normal text-stone-800">Prize Photo Ready</p>
                        {uploadSuccess && (
                          <p className="text-[11px] text-emerald-700 font-normal flex items-center gap-1">
                            <CheckCircle2 size={12} /> {uploadSuccess}
                          </p>
                        )}
                        <div className="mt-1.5 flex gap-2">
                          <label
                            htmlFor="prize-image-upload"
                            className="inline-flex items-center gap-1 border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 text-white px-2.5 py-1 text-[11px] font-normal cursor-pointer rounded-[4px] transition"
                          >
                            <Upload size={11} /> Change Photo
                          </label>
                          <button
                            type="button"
                            onClick={() => setEdit((prev) => (prev ? { ...prev, image: '' } : null))}
                            className="border border-[#E8E3D8] bg-white hover:bg-stone-100 text-stone-600 px-2.5 py-1 text-[11px] rounded-[4px] cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="prize-image-upload"
                      className="flex flex-col items-center justify-center cursor-pointer py-3"
                    >
                      <Upload size={18} className="text-stone-400" />
                      <p className="mt-1.5 text-xs font-normal text-stone-700">Click to upload photo from your device</p>
                      <p className="text-[10px] text-stone-400 font-light">Saves directly to Cloudinary (PNG, JPG, WEBP)</p>
                    </label>
                  )}
                </div>

                {uploadError && (
                  <p className="mt-1 text-xs text-red-600">{uploadError}</p>
                )}

                {/* Preset Gallery Option */}
                <div className="mt-3">
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-1">
                    Or select from presets
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 max-h-24 overflow-y-auto border border-[#E8E3D8] p-2 bg-white rounded-[4px]">
                    {GIFT_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setEdit({
                            ...edit,
                            image: preset.image,
                            name: edit.name || preset.name,
                            value: edit.value || preset.value,
                            description: edit.description || preset.description,
                          })
                        }}
                        className={`relative border p-1 text-left transition rounded-[4px] cursor-pointer ${
                          edit.image === preset.image
                            ? 'border-[#1E1B18] bg-[#FAF8F5]'
                            : 'border-[#E8E3D8] bg-white hover:border-stone-400'
                        }`}
                      >
                        <img src={preset.image} alt={preset.name} className="h-7 w-full object-cover rounded-[2px]" />
                        <p className="mt-1 text-[9px] truncate font-normal text-stone-800">{preset.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2 pt-3 border-t border-[#E8E3D8]">
              <button
                onClick={() => setEdit(null)}
                className="flex-1 border border-[#E8E3D8] bg-white py-2 text-xs font-normal text-stone-700 hover:bg-[#FAF8F5] rounded-[6px] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={!edit.name?.trim() || isUploading}
                className="flex-1 border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 py-2 text-xs font-normal text-white rounded-[6px] shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                Save Gift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
