import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf7f0] text-[#140d10] px-4 font-sans text-center">
      <div className="w-16 h-16 rounded-full bg-[#720e1e]/10 border border-[#720e1e]/30 flex items-center justify-center text-[#720e1e] font-extrabold text-2xl mb-4">
        404
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#140d10]">
        Page Not Found
      </h1>
      <p className="mt-2 text-sm text-slate-600 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center bg-[#720e1e] hover:bg-[#8d1226] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition shadow-sm"
      >
        Return to Home
      </Link>
    </div>
  )
}
