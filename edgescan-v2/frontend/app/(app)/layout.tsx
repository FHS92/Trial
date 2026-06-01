import { NavSidebar } from '@/components/nav/NavSidebar'
import { BottomNav } from '@/components/nav/BottomNav'
import { Footer } from '@/components/ui/Footer'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Skip to main content (screen reader / keyboard shortcut) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:rounded-md focus:px-3 focus:py-1.5 focus:text-sm focus:font-medium focus:bg-[var(--surface)] focus:text-[var(--text)] focus:border focus:border-[var(--accent)]"
      >
        Skip to main content
      </a>
      {/* Desktop: sidebar */}
      <NavSidebar className="hidden md:flex" />
      {/* Main content */}
      <main id="main-content" className="flex-1 overflow-y-auto pb-16 md:pb-0 flex flex-col">
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
