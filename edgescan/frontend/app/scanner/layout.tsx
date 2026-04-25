import AuthGuard from '@/components/AuthGuard'

export default function ScannerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthGuard />
      {children}
    </>
  )
}
