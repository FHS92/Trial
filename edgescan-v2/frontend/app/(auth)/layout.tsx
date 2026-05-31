export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117] p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-white">
            Edge<span className="text-indigo-500">Scan</span>
          </span>
          <p className="text-slate-400 text-sm mt-1">S&amp;P 500 Stock Scorer</p>
        </div>
        {children}
      </div>
    </div>
  )
}
