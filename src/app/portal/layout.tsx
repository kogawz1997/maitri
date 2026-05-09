import Link from 'next/link';
import { CalendarDays, Heart, UserRound } from 'lucide-react';
import { CookieConsent } from '@/components/ui/cookie-consent';

const tabs = [
  { href: '/portal/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/portal/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/portal/profile', label: 'Profile', icon: UserRound },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#140F0B] via-[#201811] to-[#2B2018] pb-24 text-[#F7EFE4]">
      <header className="sticky top-0 z-30 border-b border-[#D8B27A]/20 bg-[#140F0B]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <Link href="/portal/bookings" className="inline-flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D8B27A]/60 bg-gradient-to-b from-[#D8B27A] to-[#A87A44] font-semibold text-[#1F1610] shadow-[0_8px_30px_rgba(216,178,122,0.3)]">
              M
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#D8B27A]/90">Private Journey</p>
              <p className="font-serif text-base leading-none text-[#FFF7EC]">Maitri Grand Collection</p>
            </div>
          </Link>
          <Link href="/" className="rounded-full border border-[#D8B27A]/35 px-3 py-1 text-xs text-[#EBCB98] transition hover:border-[#D8B27A]/70 hover:text-[#FFF7EC]">
            กลับหน้าหลัก
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#D8B27A]/25 bg-[#140F0B]/90 backdrop-blur-xl">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {tabs.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 py-3 text-[11px] uppercase tracking-wide text-[#DDBE8E]/85 transition hover:bg-[#D8B27A]/10 hover:text-[#FFF7EC]"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <CookieConsent />
    </div>
  );
}
