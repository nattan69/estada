'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function FrontDeskPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    arrivals: 0,
    departures: 0,
    occupied: 0,
  });

  useEffect(() => {
    async function loadFrontDesk() {
      try {
        setLoading(true);
        const properties = await api.properties.list();
        if (!properties || properties.length === 0) {
          setError('No hi ha cap propietat configurada');
          return;
        }
        const propertyId = properties[0].id;
        const today = new Date().toISOString().split('T')[0];

        const [arrRes, depRes, inHouseRes] = await Promise.all([
          api.reports.arrivals({ date: today }),
          api.reports.departures({ date: today }),
          api.reservations.list({ propertyId, status: 'checked_in' }),
        ]);

        const occupied = Array.isArray(inHouseRes) ? inHouseRes.length : 0;

        setSummary({
          arrivals: Array.isArray(arrRes) ? arrRes.length : 0,
          departures: Array.isArray(depRes) ? depRes.length : 0,
          occupied,
        });
      } catch (e) {
        setError('Error carregant el front desk');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadFrontDesk();
  }, []);

  if (loading) return <div className="p-6 text-white">Loading...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Front Desk</h1>
      <div className="flex gap-4 mb-4">
        <a href="/front-desk/tape-chart" className="px-4 py-2 bg-brand-navy text-white rounded hover:bg-brand-dark">Tape Chart</a>
        <a href="/front-desk/arrivals" className="px-4 py-2 bg-brand-navy text-white rounded hover:bg-brand-dark">Arrivals</a>
        <a href="/front-desk/departures" className="px-4 py-2 bg-brand-navy text-white rounded hover:bg-brand-dark">Departures</a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-slate-900 border border-slate-700 rounded-lg">
          <span className="block text-xs text-slate-400 uppercase font-bold">Arrivals</span>
          <span className="text-3xl font-bold text-green-400">{summary.arrivals}</span>
        </div>
        <div className="p-6 bg-slate-900 border border-slate-700 rounded-lg">
          <span className="block text-xs text-slate-400 uppercase font-bold">Departures</span>
          <span className="text-3xl font-bold text-red-400">{summary.departures}</span>
        </div>
        <div className="p-6 bg-slate-900 border border-slate-700 rounded-lg">
          <span className="block text-xs text-slate-400 uppercase font-bold">Occupied Rooms</span>
          <span className="text-3xl font-bold text-gold-500">{summary.occupied}</span>
        </div>
      </div>
    </div>
  );
}
