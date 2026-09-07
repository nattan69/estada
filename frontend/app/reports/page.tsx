import React from 'react';

export default function ReportsPage() {
  const mockStats = [
    { label: 'Average Daily Rate (ADR)', value: '€145', trend: '+5%' },
    { label: 'RevPAR', value: '€112', trend: '+2%' },
    { label: 'Occupancy', value: '72%', trend: '-1%' },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mockStats.map((s, i) => (
          <div key={i} className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
            <span className="block text-xs text-slate-400 uppercase font-bold">{s.label}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{s.value}</span>
              <span className={`text-xs ${s.trend.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{s.trend}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="p-6 bg-slate-900 border border-slate-700 rounded-lg text-center text-slate-500 italic">
        Detailed report charts (Recharts/Chart.js) would be integrated here.
      </div>
    </div>
  );
}
