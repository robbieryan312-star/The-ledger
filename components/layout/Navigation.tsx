'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, Scale, ChevronDown, BookmarkCheck } from 'lucide-react';

const navItems = [
  { label: 'Map', href: '/' },
  {
    label: 'Politicians',
    href: '/politicians',
    sub: [
      { label: 'Browse All', href: '/politicians' },
      { label: 'Executive', href: '/politicians?branch=executive' },
      { label: 'Legislative', href: '/politicians?branch=legislative' },
      { label: 'Judicial', href: '/politicians?branch=judicial' },
      { label: 'Senate', href: '/politicians?branch=legislative&chamber=senate' },
      { label: 'House', href: '/politicians?branch=legislative&chamber=house' },
      { label: 'Governors', href: '/politicians?chamber=governor' },
      { label: 'State & Local', href: '/politicians?level=state' },
    ],
  },
  {
    label: 'Elections',
    href: '/elections',
    sub: [
      { label: 'Upcoming Elections', href: '/elections' },
      { label: 'Compare Candidates', href: '/compare' },
      { label: 'Election Calendar', href: '/elections?view=calendar' },
    ],
  },
  {
    label: 'Follow the Money',
    href: '/finance',
    sub: [
      { label: 'Campaign Finance', href: '/finance' },
      { label: 'Lobbying Profiles', href: '/lobbying' },
      { label: 'Lobbyist Tracker', href: '/finance?view=lobbyists' },
      { label: 'Congress Stock Trades', href: '/congress' },
      { label: 'Foreign-Connected Records', href: '/finance?view=foreign' },
    ],
  },
  { label: 'Compare', href: '/compare' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.07]"
         style={{ background: 'rgba(5,9,15,0.82)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg, #d4ac52 0%, #b8922f 100%)', boxShadow: '0 2px 8px rgba(212,172,82,0.3)' }}>
              <Scale className="h-4 w-4 text-[#05090f]" />
            </div>
            <div>
              <span className="text-white font-bold text-base tracking-tight leading-none">The Ledger</span>
              <span className="text-[#d4ac52]/70 text-[10px] block leading-none mt-0.5 tracking-wider uppercase">Political Transparency</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => (
              <div
                key={item.href}
                className="relative"
                onMouseEnter={() => item.sub && setOpenDropdown(item.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <Link
                  href={item.href}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                      ? 'bg-white/[0.08] text-[#d4ac52]'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {item.label}
                  {item.sub && <ChevronDown className="h-3 w-3 opacity-60" />}
                </Link>
                {item.sub && openDropdown === item.label && (
                  <div className="absolute top-full left-0 w-52 rounded-xl shadow-2xl py-1 mt-2 border border-white/[0.08]"
                       style={{ background: 'rgba(11,25,41,0.95)', backdropFilter: 'blur(20px)' }}>
                    {item.sub.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className="block px-4 py-2 text-sm text-white/60 hover:bg-white/[0.06] hover:text-white transition-colors"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* My Ledger CTA */}
          <Link
            href="/dashboard"
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
              pathname === '/dashboard'
                ? 'bg-[#c8a951]/20 text-[#c8a951] border-[#c8a951]/40'
                : 'text-[#c8a951] border-[#c8a951]/30 hover:bg-[#c8a951]/10 hover:border-[#c8a951]/50'
            }`}
          >
            <BookmarkCheck className="h-3.5 w-3.5" />
            My Ledger
          </Link>

          {/* Right badge */}
          <div className="hidden md:flex items-center gap-2">
            <div className="text-right">
              <div className="text-[10px] font-semibold tracking-wider uppercase text-[#d4ac52]/80">Data Sources</div>
              <div className="text-[10px] text-white/35">FEC · ProPublica · OpenSecrets</div>
            </div>
          </div>

          {/* Mobile button */}
          <button
            className="md:hidden text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.07] px-4 py-3 space-y-0.5"
             style={{ background: 'rgba(11,25,41,0.97)', backdropFilter: 'blur(20px)' }}>
          <Link
            href="/dashboard"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border mb-1 ${
              pathname === '/dashboard'
                ? 'bg-[#c8a951]/20 text-[#c8a951] border-[#c8a951]/40'
                : 'text-[#c8a951] border-[#c8a951]/20 hover:bg-[#c8a951]/10'
            }`}
            onClick={() => setMobileOpen(false)}
          >
            <BookmarkCheck className="h-4 w-4" />
            My Ledger
          </Link>
          {navItems.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname === item.href ? 'bg-white/[0.08] text-[#d4ac52]' : 'text-white/60 hover:text-white'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
              {item.sub?.map((sub) => (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className="block pl-6 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {sub.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
