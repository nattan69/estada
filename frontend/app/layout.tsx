import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ca">
      <body className={`${inter.className} bg-gray-50 text-slate-900`}>
        <div className="flex min-h-screen">
          {/* Simple Sidebar Placeholder */}
          <aside className="w-64 bg-brand-dark text-white p-6 flex flex-col gap-4">
            <div className="text-2xl font-bold text-brand-gold mb-8">ESTADA PMS</div>
            <nav className="flex flex-col gap-2 text-sm">
              <a href="/dashboard" className="hover:text-brand-gold p-2 rounded">Dashboard</a>
              <a href="/front-desk" className="hover:text-brand-gold p-2 rounded">Front Desk</a>
              <a href="/reservations" className="hover:text-brand-gold p-2 rounded">Reservations</a>
              <a href="/housekeeping" className="hover:text-brand-gold p-2 rounded">Housekeeping</a>
              <a href="/rates" className="hover:text-brand-gold p-2 rounded">Rates</a>
              <a href="/guests" className="hover:text-brand-gold p-2 rounded">Guests</a>
              <a href="/reports" className="hover:text-brand-gold p-2 rounded">Reports</a>
              <a href="/contracts" className="hover:text-brand-gold p-2 rounded">Agency Contracts</a>
              <a href="/fiscal" className="hover:text-brand-gold p-2 rounded">VeriFactu (Fiscal)</a>
              <a href="/night-audit" className="hover:text-brand-gold p-2 rounded">Night Audit</a>
              <a href="/settings/rooms" className="hover:text-brand-gold p-2 rounded">Rooms Settings</a>
            </nav>
          </aside>
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
