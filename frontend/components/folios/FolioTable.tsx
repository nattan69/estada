import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export function FolioTable({ folioId, onRefresh }: { folioId: string, onRefresh: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, [folioId]);

  async function loadItems() {
    setLoading(true);
    try {
      const folio = await api.folios.get(folioId);
      // Assuming folio object contains the charges/payments list, or we'd need a specific endpoint.
      // In api.ts we only have get(id) for the folio. 
      // If get(id) returns the folio with its charges, we use that.
      setItems(folio.charges || []);
    } catch (e) {
      console.error('Error loading folio items:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-4 text-slate-400 text-sm">Loading transactions...</div>;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700">
      <table className="w-full border-collapse bg-slate-900 text-white">
        <thead>
          <tr className="bg-slate-800 text-left text-xs uppercase text-slate-400">
            <th className="p-3 border-b border-slate-700">Date</th>
            <th className="p-3 border-b border-slate-700">Description</th>
            <th className="p-3 border-b border-slate-700 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={3} className="p-4 text-center text-slate-500 text-sm">No transactions found</td>
            </tr>
          ) : (
            items.map((item, i) => (
              <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                <td className="p-3 text-sm">{item.date || 'N/A'}</td>
                <td className="p-3 text-sm">{item.description}</td>
                <td className="p-3 text-sm text-right font-mono">{item.amount}€</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
