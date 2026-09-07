import React from 'react';
import { translations } from '@/lib/i18n';

export default function DashboardPage() {
  const t = translations.ca; // Defaulting to CA for mock

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-white">{t.dashboard}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Occupancy', value: '78%', color: 'text-blue-400' },
          { label: 'Arrivals', value: '12', color: 'text-green-400' },
          { label: 'Departures', value: '8', color: 'text-red-400' },
          { label: 'Revenue', value: '€1,240', color: 'text-gold-500' },
        ].map((stat, i) => (
          <div key={i} className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
            <span className="block text-xs text-slate-400 uppercase font-bold">{stat.label}</span>
            <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
          <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="text-sm text-slate-300 p-2 border-l-2 border-gold-500 bg-slate-800/50">
                Reservation #{100 + i} confirmed for Guest {i}
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
          <h2 className="text-lg font-bold text-white mb-4">Daily Alerts</h2>
          <div className="text-sm text-slate-400 italic">
            No pending critical alerts for today.
          </div>
        </div>
      </div>
    </div>
  );
}
