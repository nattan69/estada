'use client';
import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { translations } from '@/lib/i18n';

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca');
  const [loading, setLoading] = useState(true);

  const t = translations[lang];

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    try {
      const [occupancy, revenue, arrivals, departures] = await Promise.all([
        api.reports.occupancy({}),
        api.reports.revenue({}),
        api.reports.arrivals({}),
        api.reports.departures({}),
      ]);
      setStats({ occupancy, revenue, arrivals, departures });
    } catch (e) {
      console.error('Error loading reports:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6 text-white">Loading reports...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <select 
          value={lang} 
          onChange={(e) => setLang(e.target.value as any)}
          className="bg-slate-800 text-white text-xs p-1 rounded border border-slate-700"
        >
          <option value="ca">CA</option>
          <option value="es">ES</option>
          <option value="en">EN</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
          <span className="block text-xs text-slate-400 uppercase font-bold">Occupancy</span>
          <div className="text-2xl font-bold text-white">{stats?.occupancy?.value || 'N/A'}</div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
          <span className="block text-xs text-slate-400 uppercase font-bold">Revenue</span>
          <div className="text-2xl font-bold text-white">{stats?.revenue?.value || 'N/A'}</div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
          <span className="block text-xs text-slate-400 uppercase font-bold">Arrivals</span>
          <div className="text-2xl font-bold text-white">{stats?.arrivals?.count || '0'}</div>
        </div>
        <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
          <span className="block text-xs text-slate-400 uppercase font-bold">Departures</span>
          <div className="text-2xl font-bold text-white">{stats?.departures?.count || '0'}</div>
        </div>
      </div>

      <div className="p-6 bg-slate-900 border border-slate-700 rounded-lg text-center text-slate-500 italic">
        Detailed report charts would be integrated here.
      </div>
    </div>
  );
}
