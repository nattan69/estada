import './globals.css';
import { Inter } from 'next/font/google';
import LogoutButton from '@/components/LogoutButton';
import ThemeToggle from '@/components/ThemeToggle';
import WorkspaceBar, { WorkspaceProvider } from '@/components/WorkspaceBar';

const inter = Inter({ subsets: ['latin'] });

// Totes les pàgines es renderitzen dinàmicament (al request, no prerender
// estàtic). Les pàgines criden l'API i usen localStorage (només al navegador);
// el prerender estàtic fallaria al servidor.
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ca">
      <body className={`${inter.className} bg-gray-50 text-slate-900`}>
        <WorkspaceProvider>
          <div className="flex min-h-screen">
            {/* Simple Sidebar Placeholder */}
            <aside className="w-64 bg-brand-dark text-white p-6 flex flex-col gap-4">
              <div className="text-2xl font-bold text-brand-gold mb-8">ESTADA PMS</div>
              <nav className="flex flex-col gap-2 text-sm">
                <a href="/dashboard" className="hover:text-brand-gold p-2 rounded">Dashboard</a>
                <a href="/front-desk" className="hover:text-brand-gold p-2 rounded">Front Desk</a>
                <a href="/reservations" className="hover:text-brand-gold p-2 rounded">Reservations</a>
                <a href="/housekeeping" className="hover:text-brand-gold p-2 rounded">Housekeeping</a>
                <a href="/maintenance" className="hover:text-brand-gold p-2 rounded">Maintenance</a>
                <a href="/rates" className="hover:text-brand-gold p-2 rounded">Rates</a>
                <a href="/guests" className="hover:text-brand-gold p-2 rounded">Guests</a>
                <a href="/reports" className="hover:text-brand-gold p-2 rounded">Reports</a>
                <a href="/contracts" className="hover:text-brand-gold p-2 rounded">Agency Contracts</a>
                <a href="/fiscal" className="hover:text-brand-gold p-2 rounded">VeriFactu (Fiscal)</a>
                <a href="/night-audit" className="hover:text-brand-gold p-2 rounded">Night Audit</a>
                <a href="/settings/rooms" className="hover:text-brand-gold p-2 rounded">Rooms Settings</a>
                <a href="/settings" className="hover:text-brand-gold p-2 rounded">General Settings</a>
                <a href="/settings/users" className="hover:text-brand-gold p-2 rounded">👥 Usuaris</a>
                <a href="/login" className="hover:text-brand-gold p-2 rounded">Login</a>
                <LogoutButton />
              </nav>
            </aside>
            <main className="flex-1 p-8">
              <div className="flex items-center justify-between gap-4 mb-4">
                <WorkspaceBar />
                <ThemeToggle />
              </div>
              {children}
            </main>
          </div>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
