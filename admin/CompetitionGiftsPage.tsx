import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import type { Prize, CompetitionType } from '@/types'
import { Plus, X, Edit3, Trash2, Upload, Sparkles, Loader2, CheckCircle2, Trophy, Gift, ArrowRight, LayoutList, LayoutGrid } from 'lucide-react'
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal'

interface CompetitionGiftsPageProps {
  type: CompetitionType
}

export function CompetitionGiftsPage({ type }: CompetitionGiftsPageProps) {
  const { data, addPrize, updatePrize, deletePrize } = useApp()
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [edit, setEdit] = useState<Partial<Prize> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Prize | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')

  const isMega = type === 'Mega'
  const title = isMega ? 'Mega Competition Gifts' : 'Normal Competition Gifts'
  const subtitle = isMega
    ? 'Manage exclusive bumper gifts for the Mega Competition draw. Only eligible participants can enter.'
    : 'Manage regular gifts for the Normal Competition draw. Entrants who win here can still participate in Mega.'

  // Strict separation: filter prizes belonging to this competition type ONLY
  const competitionGifts = (data.prizes || []).filter((p) => {
    // If not specified, default to Normal, or match exact
    if (isMega) {
      return p.competitionType === 'Mega'
    } else {
      return p.competitionType === 'Normal' || !p.competitionType
    }
  })

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
        throw new Error(json.error || 'Failed to upload image')
      }
    } catch {
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

  const handleSave = () => {
    if (!edit?.name?.trim()) return

    if (edit.id) {
      updatePrize(edit.id, {
        name: edit.name.trim(),
        description: edit.description?.trim() ?? '',
        value: edit.value?.trim() || '₹0',
        image: edit.image || '',
        competitionType: type,
      })
    } else {
      addPrize({
        name: edit.name.trim(),
        description: edit.description?.trim() ?? '',
        value: edit.value?.trim() || '₹0',
        image: edit.image || '',
        assignedDrawId: null,
        status: 'Available',
        competitionType: type,
      })
    }
    setEdit(null)
  }

  return (
    <div className="space-y-6 font-sans font-light text-[#292524]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E8E3D8] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider rounded-[4px] border ${
                isMega
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-cyan-50 text-cyan-900 border-cyan-200'
              }`}
            >
              {isMega ? <Trophy size={12} className="text-amber-600" /> : <Gift size={12} className="text-cyan-600" />}
              <span>{type} Draw</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-normal tracking-tight text-stone-900">{title}</h1>
          </div>
          <p className="mt-1 text-xs text-stone-500 font-light">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/admin/lucky-draw?competition=${type}`)}
            className="inline-flex items-center gap-1.5 border border-[#E8E3D8] bg-white hover:bg-[#FAF8F5] px-3.5 py-2 text-xs font-normal text-stone-700 rounded-[6px] transition cursor-pointer shadow-2xs"
          >
            <Sparkles size={13} className={isMega ? 'text-amber-600' : 'text-cyan-600'} />
            <span>Launch {type} Draw</span>
          </button>

          <button
            onClick={() =>
              setEdit({
                name: '',
                description: '',
                value: '',
                image: '',
                status: 'Available',
                competitionType: type,
              })
            }
            className="inline-flex items-center gap-1.5 border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 px-4 py-2 text-xs font-normal text-white rounded-[6px] shadow-2xs transition cursor-pointer self-start sm:self-auto"
          >
            <Plus size={13} />
            <span>Add {type} Gift</span>
          </button>
        </div>
      </div>

      {/* View Switcher Toolbar */}
      <div className="flex items-center justify-between border-b border-[#E8E3D8] pb-3">
        <p className="text-xs text-stone-500 font-normal">
          Showing <strong className="text-stone-900 font-bold">{competitionGifts.length}</strong> {type} competition gifts
        </p>

        <div className="flex items-center gap-1 border border-[#E8E3D8] bg-white p-1 rounded-[6px] shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-2.5 py-1 rounded-[4px] text-xs flex items-center gap-1.5 cursor-pointer transition ${
              viewMode === 'list'
                ? 'bg-[#1E1B18] text-white shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]'
            }`}
            title="List View (One by One)"
          >
            <LayoutList size={13} />
            <span>List</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-2.5 py-1 rounded-[4px] text-xs flex items-center gap-1.5 cursor-pointer transition ${
              viewMode === 'grid'
                ? 'bg-[#1E1B18] text-white shadow-xs font-semibold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5]'
            }`}
            title="Grid View"
          >
            <LayoutGrid size={13} />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* ONE-BY-ONE LIST LAYOUT (Default) */}
      {viewMode === 'list' ? (
        <div className="space-y-3">
          {competitionGifts.map((p, idx) => {
            return (
              <article
                key={p.id}
                className="border border-[#E8E3D8] bg-white rounded-[8px] p-3 sm:p-4 shadow-2xs hover:shadow-xs hover:border-[#D8C7A3] transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Left Side: Index + Thumbnail + Details */}
                <div className="flex items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
                  <span className="w-6 text-center font-mono text-xs font-bold text-stone-400 shrink-0 hidden sm:inline-block">
                    #{idx + 1}
                  </span>

                  {/* Gift Thumbnail */}
                  <div className="relative h-20 w-28 sm:h-22 sm:w-32 rounded-[6px] overflow-hidden bg-[#FAF8F5] border border-[#E8E3D8] shrink-0 flex items-center justify-center p-1">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-full w-full object-cover rounded-[4px] transition-transform duration-200 hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-stone-400">
                        {isMega ? <Trophy size={24} className="text-amber-500" /> : <Gift size={24} className="text-cyan-500" />}
                        <span className="text-[9px] mt-1 text-stone-400">No Image</span>
                      </div>
                    )}
                    <div
                      className={`absolute bottom-1 left-1 px-1.5 py-0.2 text-[9px] font-bold uppercase rounded-[2px] text-white shadow-xs ${
                        isMega ? 'bg-amber-800/90' : 'bg-cyan-800/90'
                      }`}
                    >
                      {type}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight truncate">
                        {p.name}
                      </h2>
                      {p.value && (
                        <span className="bg-[#FAF8F5] border border-[#E8E3D8] px-2 py-0.5 text-xs font-mono font-semibold text-stone-800 rounded-[4px]">
                          {p.value}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-[4px] border ${
                          p.status === 'Awarded'
                            ? 'text-amber-900 bg-amber-50 border-amber-200'
                            : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                        }`}
                      >
                        {p.status || 'Available'}
                      </span>
                      {p.status === 'Awarded' && (
                        <button
                          type="button"
                          onClick={() => updatePrize(p.id, { status: 'Available' })}
                          className="text-[10px] text-stone-500 hover:text-stone-900 underline ml-1 cursor-pointer"
                          title="Reset this gift so it can be drawn again"
                        >
                          Make Available Again
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-stone-500 font-normal line-clamp-1 sm:line-clamp-2">
                      {p.description || `${type} Competition official prize`}
                    </p>
                  </div>
                </div>

                {/* Right Side: Actions */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-[#F2EFE9] pt-2 md:pt-0 shrink-0">
                  <button
                    onClick={() => navigate(`/admin/lucky-draw?competition=${type}&giftId=${p.id}`)}
                    className={`inline-flex items-center gap-1.5 py-2 px-3.5 text-xs font-bold rounded-[6px] shadow-2xs transition cursor-pointer ${
                      isMega
                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                        : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-600/20'
                    }`}
                  >
                    <Sparkles size={12} />
                    <span>Select for Draw</span>
                  </button>

                  <button
                    onClick={() => setEdit(p)}
                    className="inline-flex items-center gap-1 border border-[#E8E3D8] bg-white hover:bg-[#FAF8F5] px-3 py-2 text-xs font-medium text-stone-700 rounded-[6px] transition cursor-pointer"
                    title="Edit Gift"
                  >
                    <Edit3 size={12} />
                    <span className="hidden sm:inline">Edit</span>
                  </button>

                  <button
                    onClick={() => setDeleteTarget(p)}
                    className="inline-flex items-center gap-1 border border-stone-200 bg-white hover:bg-red-50 hover:text-red-700 text-stone-400 px-3 py-2 text-xs font-medium rounded-[6px] transition cursor-pointer"
                    title="Delete Gift"
                  >
                    <Trash2 size={12} />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        /* GRID OF GIFTS */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {competitionGifts.map((p) => {
            return (
              <article
                key={p.id}
                className="border border-[#E8E3D8] bg-white rounded-[6px] shadow-2xs hover:shadow-xs transition duration-200 flex flex-col overflow-hidden"
              >
                {/* Prize Image */}
                <div className="relative h-48 w-full overflow-hidden bg-[#FAF8F5] flex items-center justify-center">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-stone-400">
                      {isMega ? <Trophy size={36} className="text-amber-500" /> : <Gift size={36} className="text-cyan-500" />}
                      <span className="text-[10px] mt-1 text-stone-400">No Image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                  {/* Competition Tag */}
                  <div
                    className={`absolute left-3 top-3 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-[3px] shadow-2xs backdrop-blur-xs ${
                      isMega ? 'bg-amber-950/80 text-amber-200 border border-amber-600/50' : 'bg-cyan-950/80 text-cyan-200 border border-cyan-600/50'
                    }`}
                  >
                    {type} Gift
                  </div>

                  {/* Value Pill Top Right */}
                  <div className="absolute top-3 right-3 rounded-[4px] bg-white/95 backdrop-blur-xs border border-[#E8E3D8] px-2.5 py-0.5 text-xs font-mono text-stone-900 shadow-2xs">
                    {p.value || 'Bumper Prize'}
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h2 className="text-sm font-normal text-stone-900 truncate">{p.name}</h2>
                    <p className="mt-1 text-xs text-stone-500 font-light line-clamp-2">
                      {p.description || `${type} Competition official prize`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-[#F2EFE9] pt-3">
                    <button
                      onClick={() => navigate(`/admin/lucky-draw?competition=${type}&giftId=${p.id}`)}
                      className="inline-flex items-center gap-1.5 text-xs font-normal text-stone-900 hover:text-cyan-700 transition"
                    >
                      <Sparkles size={12} className={isMega ? 'text-amber-600' : 'text-cyan-600'} />
                      <span>Select for Draw</span>
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
                        onClick={() => setDeleteTarget(p)}
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
      )}

      {competitionGifts.length === 0 && (
        <div className="border border-[#E8E3D8] bg-white p-12 text-center rounded-[6px] shadow-2xs space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#FAF8F5] flex items-center justify-center text-stone-400">
            {isMega ? <Trophy size={22} className="text-amber-600" /> : <Gift size={22} className="text-cyan-600" />}
          </div>
          <p className="text-xs text-stone-500 font-normal">No {type} Competition gifts added yet.</p>
          <p className="text-[11px] text-stone-400 font-light">All gifts are stored dynamically in the database.</p>
          <button
            onClick={() =>
              setEdit({
                name: '',
                description: '',
                value: '',
                image: '',
                status: 'Available',
                competitionType: type,
              })
            }
            className="inline-flex items-center gap-1 border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 px-4 py-2 text-xs font-normal text-white rounded-[6px] transition cursor-pointer"
          >
            <Plus size={13} />
            <span>Add First {type} Gift</span>
          </button>
        </div>
      )}

      {/* Edit / Add Modal */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-auto border border-[#E8E3D8] bg-white p-5 sm:p-6 rounded-[6px] shadow-lg">
            <div className="flex items-center justify-between border-b border-[#E8E3D8] pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-[3px] border ${
                    isMega ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-cyan-50 text-cyan-900 border-cyan-200'
                  }`}
                >
                  {type}
                </span>
                <h3 className="text-sm font-normal text-stone-900">
                  {edit.id ? `Edit ${type} Gift` : `Add New ${type} Gift`}
                </h3>
              </div>
              <button
                onClick={() => setEdit(null)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs font-light">
              <div>
                <label className="block text-xs font-normal text-stone-600">Gift Name *</label>
                <input
                  className="mt-1 w-full border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-[#9A7B4F] rounded-[4px]"
                  placeholder={isMega ? 'e.g. Maruti Suzuki Swift Car, Bumper Gold 10 Sovereign' : 'e.g. Smart 4K TV, Refrigerator, Smartphone'}
                  value={edit.name ?? ''}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-stone-600">Description</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-[#9A7B4F] rounded-[4px]"
                  placeholder="Additional details about the prize"
                  value={edit.description ?? ''}
                  onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-stone-600">Prize Value</label>
                <input
                  className="mt-1 w-full border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-[#9A7B4F] rounded-[4px]"
                  placeholder="e.g. ₹5,00,000"
                  value={edit.value ?? ''}
                  onChange={(e) => setEdit({ ...edit, value: e.target.value })}
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-normal text-stone-600 mb-1">Prize Photo</label>
                <div className="border border-dashed border-[#E8E3D8] bg-[#FAF8F5] p-3.5 text-center rounded-[6px]">
                  <input
                    type="file"
                    id="competition-prize-image-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />

                  {isUploading ? (
                    <div className="flex flex-col items-center justify-center py-4 space-y-2">
                      <Loader2 size={18} className="animate-spin text-[#9A7B4F]" />
                      <p className="text-xs text-stone-600 font-light">Uploading image...</p>
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
                            htmlFor="competition-prize-image-upload"
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
                      htmlFor="competition-prize-image-upload"
                      className="flex flex-col items-center justify-center cursor-pointer py-3"
                    >
                      <Upload size={18} className="text-stone-400" />
                      <p className="mt-1.5 text-xs font-normal text-stone-700">Click to upload photo from your device</p>
                      <p className="text-[10px] text-stone-400 font-light">Uploads to Cloudinary (PNG, JPG, WEBP)</p>
                    </label>
                  )}
                </div>

                {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
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
                onClick={handleSave}
                disabled={!edit.name?.trim() || isUploading}
                className="flex-1 border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 py-2 text-xs font-normal text-white rounded-[6px] shadow-2xs transition cursor-pointer disabled:opacity-40"
              >
                Save {type} Gift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={`Delete ${type} Gift`}
        itemName={deleteTarget?.name || ''}
        itemType={`${type} Gift`}
        warningDetails={
          deleteTarget ? (
            <>
              You are about to permanently delete <strong className="font-semibold text-red-950">{deleteTarget.name}</strong> from{' '}
              {type} Competition.
            </>
          ) : undefined
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          const id = deleteTarget.id
          setDeleteTarget(null)
          deletePrize(id)
        }}
      />
    </div>
  )
}
