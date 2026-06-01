import { NavSidebar } from '@/components/nav/NavSidebar'
import { BottomNav } from '@/components/nav/BottomNav'
import { Footer } from '@/components/ui/Footer'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop: sidebar */}
      <NavSidebar className="hidden md:flex" />
      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 flex flex-col">
        <div className="flex-1">
          {children}
        </div>
        <Footer />
      </main>
      {/* Mobile: bottom tabs */}
      <BottomNav className="md:hidden" />
    </div>
  )
}
