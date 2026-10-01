import { useState } from 'react'
import { Upload, Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { formatParticipantsForExcelCsv, downloadCsvFile, parseCsvText } from '@/lib/exportCsv'

type Stage = 'idle' | 'uploading' | 'validating' | 'done'

export function ImportPage() {
  const { data, bulkRegisterParticipants } = useApp()
  const [stage, setStage] = useState<Stage>('idle')
  const [fileName, setFileName] = useState('')
  const [stats, setStats] = useState({
    totalRows: 0,
    added: 0,
    duplicates: 0,
    invalid: 0,
  })

  // Download sample template formatted specifically for Microsoft Excel
  const downloadSampleTemplate = () => {
    const csvContent = 'Name,Phone,Place,BillNumber,BillAmount\nParticipant Name,9876543210,Valanchery,BILL-001,1500'
    downloadCsvFile(csvContent, 'Sample-Participants-Template.csv')
  }

  // Export all current registered participants to CSV
  const downloadCurrentParticipants = () => {
    const csvContent = formatParticipantsForExcelCsv(data.participants)
    downloadCsvFile(csvContent, `Registered-Participants-${data.participants.length}.csv`)
  }

  const handleFileUpload = (file: File) => {
    setFileName(file.name)
    setStage('uploading')

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setStage('validating')

      setTimeout(async () => {
        try {
          const parsed = parseCsvText(text)
          if (parsed.length === 0) {
            setStats({ totalRows: 0, added: 0, duplicates: 0, invalid: 1 })
            setStage('done')
            return
          }

          const res = await bulkRegisterParticipants(parsed)
          setStats({
            totalRows: parsed.length,
            added: res.added,
            duplicates: res.duplicates,
            invalid: res.invalid,
          })
          setStage('done')
        } catch {
          setStats({ totalRows: 0, added: 0, duplicates: 0, invalid: 1 })
          setStage('done')
        }
      }, 700)
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6 font-sans font-light text-[#292524]">
      <div className="border-b border-[#E8E3D8] pb-4">
        <h1 className="text-xl sm:text-2xl font-normal tracking-tight text-stone-900">
          Import & Export Participants
        </h1>
        <p className="mt-0.5 text-xs text-stone-500 font-light">
          Import or export participant records via CSV or Excel spreadsheet.
        </p>
      </div>

      {/* Upload Zone */}
      <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-[6px] border border-dashed border-[#E8E3D8] bg-white p-6 text-center transition hover:border-[#9A7B4F] hover:bg-[#FAF8F5] shadow-2xs">
        <div className="flex h-11 w-11 items-center justify-center rounded-[4px] bg-[#FAF8F5] text-stone-700 border border-[#E8E3D8]">
          <Upload size={18} />
        </div>
        <p className="mt-3 text-xs sm:text-sm font-normal text-stone-800">Click or Drag & Drop CSV / Excel Spreadsheet</p>
        <p className="mt-1 text-[11px] font-light text-stone-400">Supports .csv, .xlsx files with Name and Phone</p>
        <input
          type="file"
          accept=".csv,.txt,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFileUpload(f)
          }}
        />
      </label>

      {/* Download Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={downloadSampleTemplate}
            className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 px-3.5 py-2 text-xs font-normal text-white transition cursor-pointer shadow-2xs"
          >
            <Download size={13} className="text-[#C2A676]" />
            <span>Sample Template</span>
          </button>
          <button
            onClick={downloadCurrentParticipants}
            className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#E8E3D8] bg-white hover:bg-[#FAF8F5] px-3.5 py-2 text-xs font-normal text-stone-700 transition cursor-pointer shadow-2xs"
          >
            <Download size={13} className="text-[#9A7B4F]" />
            <span>Export Participants ({data.participants.length})</span>
          </button>
        </div>
      </div>

      {stage !== 'idle' && (
        <div className="rounded-[6px] border border-[#E8E3D8] bg-white p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-normal text-stone-600">
            <FileSpreadsheet size={15} className="text-[#9A7B4F]" /> {fileName}
          </div>
          <p className="text-sm font-normal text-stone-900">
            {stage === 'uploading' && 'Reading spreadsheet rows…'}
            {stage === 'validating' && 'Validating phone numbers and registering…'}
            {stage === 'done' && 'Spreadsheet Processed Successfully'}
          </p>

          {stage === 'done' && (
            <>
              <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-4">
                {[
                  ['Total Rows', String(stats.totalRows)],
                  ['Added', String(stats.added)],
                  ['Duplicates', String(stats.duplicates)],
                  ['Invalid', String(stats.invalid)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-[4px] border border-[#E8E3D8] bg-[#FAF8F5] p-3">
                    <p className="text-[10px] font-normal text-stone-500 uppercase">{k}</p>
                    <p className="mt-1 text-lg font-medium text-stone-900">{v}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[4px] border border-[#E8E3D8] bg-[#FAF8F5] p-3 text-xs font-normal text-stone-800 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#9A7B4F] shrink-0" />
                <span>
                  <strong>{stats.added} new participants</strong> added to database and eligible for lucky draws.
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
