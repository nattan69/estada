'use client';
import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Dialog } from '@/components/ui/dialog';
import { AddChargeDialog } from '@/components/folios/AddChargeDialog';
import { PaymentDialog } from '@/components/folios/PaymentDialog';
import { FolioTable } from '@/components/folios/FolioTable';
import { translations } from '@/lib/i18n';

export default function FolioPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [folio, setFolio] = useState<any>(null);
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca');
  const [isChargeOpen, setIsChargeOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const t = translations[lang];

  useEffect(() => {
    loadFolio();
  }, [id]);

  async function loadFolio() {
    setLoading(true);
    try {
      const data = await api.folios.get(id);
      setFolio(data);
    } catch (e) {
      console.error('Error loading folio:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseFolio() {
    if (!confirm('Are you sure you want to close this folio?')) return;
    try {
      await api.folios.close(id);
      await loadFolio();
    } catch (e) {
      alert('Error closing folio');
    }
  }

  if (loading) return <div className="p-6 text-white">Loading...</div>;
  if (!folio) return <div className="p-6 text-white">Folio not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Guest Folio</h1>
            <p className="text-slate-400 text-sm">Folio ID: {id}</p>
          </div>
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
        <div className="flex gap-2">
          <button onClick={() => setIsChargeOpen(true)} className="px-4 py-2 bg-slate-800 text-white text-sm rounded border border-slate-700 hover:bg-slate-700">
            + Add Charge
          </button>
          <button onClick={() => setIsPaymentOpen(true)} className="px-4 py-2 bg-gold-500 text-slate-900 text-sm font-bold rounded hover:bg-gold-400">
            Register Payment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FolioTable folioId={id} onRefresh={loadFolio} />
        </div>
        <div className="p-6 bg-slate-900 border border-slate-700 rounded-lg space-y-4">
          <h2 className="text-lg font-bold text-white border-b border-slate-700 pb-2">Balance Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Total Charges:</span> <span className="text-white">€{folio.total_amount}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Total Paid:</span> <span className="text-white">€{folio.paid_amount}</span></div>
            <div className="flex justify-between font-bold text-lg border-t border-slate-700 pt-2 mt-2">
              <span className="text-slate-400">Balance:</span> <span className="text-gold-500">€{folio.balance}</span>
            </div>
          </div>
          <button 
            onClick={handleCloseFolio}
            className="w-full py-2 bg-slate-800 text-white text-sm rounded border border-slate-700 hover:bg-slate-700"
          >
            Close Folio
          </button>
        </div>
      </div>

      <AddChargeDialog folioId={id} onClose={() => setIsChargeOpen(false)} onRefresh={loadFolio} />
      <PaymentDialog folioId={id} onClose={() => setIsPaymentOpen(false)} onRefresh={loadFolio} />
    </div>
  );
}
