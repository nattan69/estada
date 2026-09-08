'use client';
import React, { useState, useEffect } from 'react';
import { Table } from '@/components/ui/table';
import { api } from '@/lib/api';
import { translations } from '@/lib/i18n';

export default function RatesPage() {
  const [rates, setRates] = useState<any[]>([]);
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca');
  const [loading, setLoading] = useState(true);

  const t = translations[lang];

  useEffect(() => {
    loadRates();
  }, []);

  async function loadRates() {
    setLoading(true);
    try {
      const data = await api.rates.list({});
      setRates(data);
    } catch (e) {
      console.error('Error loading rates:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkUpdate() {
    const confirmation = confirm('Do you want to perform a bulk update of rates?');
    if (!confirmation) return;
    
    try {
      // Example bulk update payload
      await api.rates.bulkUpsert([{ room_type_id: 'rt-1', price: 120, date: '2026-09-10' }]);
      alert('Rates updated successfully');
      await loadRates();
    } catch (e) {
      alert('Error updating rates');
    }
  }

  if (loading) return <div className="p-6 text-white">Loading...</div>;

  const columns = [
    { header: 'Room Type', accessor: (r: any) => r.room_type_id },
    { header: 'Plan', accessor: (r: any) => r.rate_plan_id },
    { header: 'Date', accessor: 'date' },
    { header: 'Price', accessor: (r: any) => `€${r.price}` },
    { header: 'Stop Sell', accessor: (r: any) => r.stop_sell ? 'Yes' : 'No' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Rates Management</h1>
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
        <button 
          onClick={handleBulkUpdate}
          className="px-4 py-2 bg-gold-500 text-slate-900 text-sm font-bold rounded hover:bg-gold-400"
        >
          Bulk Update
        </button>
      </div>
      <Table data={rates} columns={columns} />
    </div>
  );
}
