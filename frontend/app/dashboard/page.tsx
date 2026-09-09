'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { translations } from '@/lib/i18n';

export default function DashboardPage() {
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    occupancy: 0,
    revenue: 0,
    arrivals: 0,
    departures: 0,
  });

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const properties = await api.properties.list();
        if (!properties || properties.length === 0) {
          setError('No hi ha cap propietat configurada');
          return;
        }
        const propertyId = properties[0].id;
        const today = new Date().toISOString().split('T')[0];

        const [occRes, revRes, arrRes, depRes] = await Promise.all([
          api.reports.occupancy({ propertyId, from: today, to: today }),
          api.reports.revenue({ propertyId, from: today, to: today }),
          api.reports.arrivals({ date: today }),
          api.reports.departures({ date: today }),
        ]);

        setStats({
          occupancy: occRes.occupancy_pct || 0,
          revenue: Number(revRes.revenue) || 0,
          arrivals: Array.isArray(arrRes) ? arrRes.length : 0,
          departures: Array.isArray(depRes) ? depRes.length : 0,
        });
      } catch (e) {
        setError('Error carregant el dashboard');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const t = translations[lang];

  if (loading) return <div className="p-6 text-white">Loading...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">{t.dashboard}</h1>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as any)}
          className="bg-slate-800 text-white text-xs border border-slate-700 rounded px-2 py-1"
        >
          <option value="ca">CA</option>
          <option value="es">ES</option>
          <option value="en">EN</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Occupancy', value: `${stats.occupancy.toFixed(1)}%`, color: 'text-blue-400' },
          { label: 'Arrivals', value: String(stats.arrivals), color: 'text-green-400' },
          { label: 'Departures', value: String(stats.departures), color: 'text-red-400' },
          { label: 'Revenue', value: `€${stats.revenue.toLocaleString()}`, color: 'text-gold-500' },
        ].map((stat, i) => (
          <div key={i} className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
            <span className="block text-xs text-slate-400 uppercase font-bold">{stat.label}</span>
            <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
