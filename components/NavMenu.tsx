'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const links = [
  { href: '/matches', label: 'Matches' },
  { href: '/groups', label: 'Groups' },
  { href: '/tournament', label: 'Trophy' },
  { href: '/leaderboard', label: 'Scores' },
  { href: '/trophy-picks', label: 'Picks' },
];

export function NavMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden sm:flex items-center gap-1 text-sm">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
            {l.label}
          </Link>
        ))}
      </nav>

      {/* Mobile 3-dots menu */}
      <div className="sm:hidden relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-2 rounded-lg hover:bg-green-700 transition-colors text-xl font-bold leading-none tracking-tighter"
          aria-label="Open menu"
          aria-expanded={open}
        >
          •••
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[150px] z-50">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-gray-800 hover:bg-gray-50 active:bg-gray-100 text-sm font-medium"
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
