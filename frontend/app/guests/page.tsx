import React, { useEffect, useState } from 'react';
import { Table } from '@/components/ui/table';
import { api } from '@/lib/api';
import { Guest } from '@/lib/types';
import { translations } from '@/lib/i18n';

export default function GuestsPage() {
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGuests() {
      try {
        setLoading(true);
        const data = await api.guests.list();
        setGuests(data);
      } catch (e) {
        setError('Error carregant hòspits');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadGuests();
  }, []);

  const t = translations[lang];

  const columns: { header: string; accessor: keyof Guest | ((g: Guest) => React.ReactNode) }[] = [
    { header: 'ID', accessor: 'id' },
    { header: 'First Name', accessor: 'first_name' },
    { header: 'Last Name', accessor: 'last_name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { 
      header: 'Actions', 
      accessor: (g: Guest) => (
        <button className="text-gold-500 text-xs font-bold hover:underline">
          Profile
        </button>
      ) 
    },
  ];

  if (loading) return <div className="p-6 text-white">Loading...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">{t.guests}</h1>
        <div className="flex gap-4">
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value as any)}
            className="bg-slate-800 text-white text-xs border border-slate-700 rounded px-2 py-1"
          >
            <option value="ca">CA</option>
            <option value="es">ES</option>
            <option value="en">EN</option>
          </select>
          <button className="px-4 py-2 bg-gold-500 text-slate-900 text-sm font-bold rounded hover:bg-gold-400">
            + Add Guest
          </button>
        </div>
      </div>
      <Table data={guests} columns={columns} />
    </div>
  );
}
