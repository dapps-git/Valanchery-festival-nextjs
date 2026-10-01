import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Ticket,
  CheckCircle2,
  Copy,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Check,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { formatShortDate } from '@/lib/format'
import { formatCouponDisplay } from '@/lib/tokenHelper'
import { exportCouponsToXlsx } from '@/lib/exportCsv'

const PAGE_SIZE = 50

export function CouponsDirectoryPage() {
  const { coupons, data } = useApp()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'Unused' | 'Used'>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isLoadingServer, setIsLoadingServer] = useState(false)
  const [serverCoupons, setServerCoupons] = useState<any[]>([])
  const [serverTotal, setServerTotal] = useState<number>(0)

  const handleDownloadPageExcel = () => {
    if (displayCoupons.length === 0) return
    exportCouponsToXlsx(displayCoupons, `coupons-page-${currentPage}.xlsx`)
  }

  // Fetch paginated coupons from MongoDB API
  useEffect(() => {
    let isMounted = true
    const fetchCoupons = async () => {
      setIsLoadingServer(true)
      try {
        const queryParams = new URLSearchParams({
          page: String(currentPage),
          limit: String(PAGE_SIZE),
          search: searchQuery.trim(),
          status: statusFilter,
        })
        const res = await fetch(`/api/coupons?${queryParams.toString()}`)
        if (res.ok) {
          const d = await res.json()
          if (isMounted && d.ok && Array.isArray(d.coupons)) {
            setServerCoupons(d.coupons)
            setServerTotal(d.filteredCount ?? d.totalCoupons ?? 0)
            setIsLoadingServer(false)
            return
          }
        }
      } catch {
        // fallback
      }
      if (isMounted) setIsLoadingServer(false)
    }

    const timer = setTimeout(fetchCoupons, 200)
    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [currentPage, searchQuery, statusFilter])

  // Map participant details
  const participantMap = useMemo(() => {
    const map = new Map<string, typeof data.participants[0]>()
    data.participants.forEach((p) => {
      if (p.couponId) {
        map.set(p.couponId.replace(/[^A-Za-z0-9]/g, '').toUpperCase(), p)
      }
    })
    return map
  }, [data.participants])

  // Aggregate stats
  const totalCount =
    serverTotal !== undefined
      ? serverTotal
      : (typeof data.totalCouponsCount === 'number' ? data.totalCouponsCount : (data.batches || []).reduce((acc, b) => acc + (b.count || 0), 0))
  const usedCount = data.usedCouponsCount ?? data.participants?.length ?? 0
  const activeCount = Math.max(0, totalCount - usedCount)

  const effectiveFilteredCount =
    statusFilter === 'Used'
      ? usedCount
      : statusFilter === 'Unused'
      ? activeCount
      : serverTotal || totalCount

  const displayCoupons = useMemo(() => {
    if (serverCoupons.length > 0) {
      return serverCoupons.map((c) => {
        const p = participantMap.get(c.id.replace(/[^A-Za-z0-9]/g, '').toUpperCase())
        return {
          id: c.id,
          serialNo: c.serialNo,
          batchId: c.batchId,
          status: c.status,
          createdAt: c.createdAt,
          usedAt: c.usedAt || p?.registeredAt,
          participantName: p?.name || c.participantName,
          participantPhone: p?.phone || c.participantPhone,
          participantLocation: p?.location || c.participantLocation,
        }
      })
    }

    let list = (coupons || []).map((c) => {
      const p = participantMap.get(c.id.replace(/[^A-Za-z0-9]/g, '').toUpperCase())
      return {
        id: c.id,
        serialNo: c.serialNo,
        batchId: c.batchId,
        status: (p ? 'Used' : c.status) as 'Unused' | 'Used',
        createdAt: c.createdAt,
        usedAt: p?.registeredAt,
        participantName: p?.name,
        participantPhone: p?.phone,
        participantLocation: p?.location,
      }
    })

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          (c.serialNo && c.serialNo.toLowerCase().includes(q)) ||
          (c.participantName && c.participantName.toLowerCase().includes(q)) ||
          (c.participantPhone && c.participantPhone.includes(q))
      )
    }

    if (statusFilter !== 'all') {
      list = list.filter((c) => c.status === statusFilter)
    }

    if (dateFilter) {
      list = list.filter((c) => {
        const d = (c.usedAt || c.createdAt || '').slice(0, 10)
        return d === dateFilter
      })
    }

    return list.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  }, [serverCoupons, coupons, participantMap, searchQuery, statusFilter, dateFilter, currentPage])

  const totalPages = Math.max(1, Math.ceil(effectiveFilteredCount / PAGE_SIZE))

  const copyCouponCode = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div className="space-y-6 font-sans font-light text-[#292524]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E8E3D8] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal tracking-tight text-stone-900">
            Coupons Directory
          </h1>
          <p className="mt-0.5 text-xs text-stone-500 font-light">
            Search and verify all generated festival coupons
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPageExcel}
            disabled={displayCoupons.length === 0}
            className="flex items-center gap-1.5 rounded-[6px] border border-[#E8E3D8] bg-white hover:bg-[#FAF8F5] px-3.5 py-1.5 text-xs font-normal text-stone-700 transition shadow-2xs disabled:opacity-40 cursor-pointer"
            title="Download visible coupons"
          >
            <FileSpreadsheet size={13} className="text-stone-500" />
            <span>Export Page ({displayCoupons.length})</span>
          </button>

          <Link
            to="/admin/coupons"
            className="flex items-center gap-1.5 rounded-[6px] border border-[#1E1B18] bg-[#1E1B18] px-3.5 py-1.5 text-xs font-normal text-white hover:bg-stone-800 transition shadow-2xs"
          >
            <Ticket size={13} className="text-[#C2A676]" />
            <span>Generate Batch</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => {
            setStatusFilter('all')
            setCurrentPage(1)
          }}
          className={`p-3.5 rounded-[6px] border text-left transition cursor-pointer ${
            statusFilter === 'all'
              ? 'border-[#1E1B18] bg-white shadow-2xs'
              : 'border-[#E8E3D8] bg-white hover:bg-[#FAF8F5]'
          }`}
        >
          <p className="text-[10px] font-normal text-stone-500 uppercase tracking-wider">Total Coupons</p>
          <p className="text-xl font-light text-stone-900 mt-1">{totalCount.toLocaleString()}</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter('Unused')
            setCurrentPage(1)
          }}
          className={`p-3.5 rounded-[6px] border text-left transition cursor-pointer ${
            statusFilter === 'Unused'
              ? 'border-[#1E1B18] bg-white shadow-2xs'
              : 'border-[#E8E3D8] bg-white hover:bg-[#FAF8F5]'
          }`}
        >
          <p className="text-[10px] font-normal text-stone-500 uppercase tracking-wider">Available (Unused)</p>
          <p className="text-xl font-light text-[#9A7B4F] mt-1">{activeCount.toLocaleString()}</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter('Used')
            setCurrentPage(1)
          }}
          className={`p-3.5 rounded-[6px] border text-left transition cursor-pointer ${
            statusFilter === 'Used'
              ? 'border-[#1E1B18] bg-white shadow-2xs'
              : 'border-[#E8E3D8] bg-white hover:bg-[#FAF8F5]'
          }`}
        >
          <p className="text-[10px] font-normal text-stone-500 uppercase tracking-wider">Registered</p>
          <p className="text-xl font-light text-emerald-700 mt-1">{usedCount.toLocaleString()}</p>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="border border-[#E8E3D8] bg-white p-3.5 rounded-[6px] shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-6 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search serial no, coupon code, name, phone..."
              className="w-full border border-[#E8E3D8] bg-[#FAF8F5] pl-8 pr-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 outline-none focus:border-[#9A7B4F] rounded-[6px]"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any)
                setCurrentPage(1)
              }}
              className="w-full border border-[#E8E3D8] bg-[#FAF8F5] px-3 py-1.5 text-xs text-stone-700 outline-none focus:border-[#9A7B4F] rounded-[6px]"
            >
              <option value="all">All Statuses ({totalCount.toLocaleString()})</option>
              <option value="Unused">Available ({activeCount.toLocaleString()})</option>
              <option value="Used">Registered ({usedCount.toLocaleString()})</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full border border-[#E8E3D8] bg-[#FAF8F5] px-3 py-1.5 text-xs text-stone-700 outline-none focus:border-[#9A7B4F] rounded-[6px]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-stone-400 pt-0.5">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="font-normal text-stone-700">{displayCoupons.length}</strong> coupons (Page {currentPage} of {totalPages})
            </span>
            {isLoadingServer && <Loader2 size={11} className="animate-spin text-[#9A7B4F]" />}
          </div>
          <span>50 per page</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-[#E8E3D8] bg-white rounded-[6px] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="border-b border-[#E8E3D8] bg-[#FAF8F5] text-[10px] font-normal text-stone-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5 w-10">#</th>
                <th className="px-4 py-2.5">Serial No</th>
                <th className="px-4 py-2.5">Coupon Code</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Participant</th>
                <th className="px-4 py-2.5">Phone</th>
                <th className="px-4 py-2.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2EFE9]">
              {displayCoupons.map((item, idx) => {
                const rowNum = (currentPage - 1) * PAGE_SIZE + idx + 1
                const isRegistered = item.status === 'Used'

                return (
                  <tr key={item.id || idx} className="hover:bg-[#FAF8F5] transition text-stone-800">
                    <td className="px-4 py-2.5 text-stone-400 font-mono text-[11px]">{rowNum}</td>

                    <td className="px-4 py-2.5">
                      {item.serialNo ? (
                        <span className="font-mono text-xs text-stone-800 bg-[#FAF8F5] px-2 py-0.5 rounded-[4px] border border-[#E8E3D8]">
                          {item.serialNo}
                        </span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-stone-900 bg-[#F5F2EB] px-2 py-0.5 rounded-[4px] border border-[#E8E3D8]">
                          {formatCouponDisplay(item.id)}
                        </span>
                        <button
                          onClick={() => copyCouponCode(item.id)}
                          className="text-stone-400 hover:text-stone-700 p-0.5 rounded transition cursor-pointer"
                          title="Copy"
                        >
                          {copiedId === item.id ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </td>

                    <td className="px-4 py-2.5">
                      {isRegistered ? (
                        <span className="inline-flex items-center gap-1 border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-800 rounded-[4px]">
                          <CheckCircle2 size={10} />
                          Registered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 border border-[#E8E3D8] bg-[#FAF8F5] px-2 py-0.5 text-[10px] text-stone-600 rounded-[4px]">
                          <Ticket size={10} className="text-[#9A7B4F]" />
                          Available
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-2.5">
                      {item.participantName ? (
                        <div className="flex items-center gap-1 text-stone-900 font-normal">
                          <User size={11} className="text-stone-400" />
                          <span>{item.participantName}</span>
                        </div>
                      ) : (
                        <span className="text-stone-400 font-light">—</span>
                      )}
                    </td>

                    <td className="px-4 py-2.5">
                      {item.participantPhone ? (
                        <div className="flex items-center gap-1 font-mono text-stone-600">
                          <Phone size={11} className="text-stone-400" />
                          <span>{item.participantPhone}</span>
                        </div>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-2.5 text-stone-400 text-[11px] font-light">
                      {formatShortDate(item.usedAt || item.createdAt)}
                    </td>
                  </tr>
                )
              })}

              {displayCoupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-400 text-xs font-light">
                    {isLoadingServer ? 'Loading coupons...' : 'No coupons found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="border-t border-[#E8E3D8] bg-[#FAF8F5] px-4 py-2.5 flex items-center justify-between text-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 border border-[#E8E3D8] bg-white px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-40 transition cursor-pointer rounded-[4px]"
            >
              <ChevronLeft size={13} /> Previous
            </button>

            <span className="text-stone-500 font-light">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-1 border border-[#E8E3D8] bg-white px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-40 transition cursor-pointer rounded-[4px]"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
