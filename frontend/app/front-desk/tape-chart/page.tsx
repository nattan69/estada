import React from 'react';
import { TapeChart } from '@/components/tape-chart/TapeChart';
import { translations } from '@/lib/i18n';

export default function TapeChartPage() {
  const t = translations.ca;

  return (
    <div className="p-6 h-screen flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Tape Chart</h1>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-slate-800 text-white text-sm rounded border border-slate-700">Today</button>
          <button className="px-3 py-1 bg-slate-800 text-white text-sm rounded border border-slate-700">Next Week</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-slate-900 rounded-lg border border-slate-700">
        <TapeChart />
      </div>
    </div>
  );
}
