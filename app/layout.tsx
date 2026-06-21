import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { cookies } from 'next/headers';
import './globals.css';
import { SESSION_COOKIE } from '@/lib/auth';
import { NavMenu } from '@/components/NavMenu';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'World Cup 2026 Bets',
  description: 'Bet on the World Cup with your friends',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const isLoggedIn = !!cookieStore.get(SESSION_COOKIE)?.value;

  return (
    <html lang="en">
      <body className={`${inter.className} overflow-x-hidden`}>
        <header className="bg-green-800 text-white shadow-lg sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href={isLoggedIn ? '/matches' : '/'} className="flex items-center gap-2 font-bold text-lg">
              <span className="text-2xl">⚽</span>
              <span className="hidden sm:inline">World Cup 2026</span>
              <span className="sm:hidden">WC 2026</span>
            </Link>
            {isLoggedIn && <NavMenu />}
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
