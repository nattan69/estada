'use client';

import React, { useEffect, useState } from 'react';
import { Table } from '@/components/ui/table';
import { api } from '@/lib/api';
import { Room } from '@/lib/types';
import { translations } from '@/lib/i18n';

export default function RoomsSettingsPage() {
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRooms() {
      try {
        setLoading(true);
        const data = await api.rooms.list();
        setRooms(data);
      } catch (e) {
        setError('Error carregant habitacions');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadRooms();
  }, []);

  const t = translations[lang];

  const columns: { header: string; accessor: keyof Room | ((r: Room) => React.ReactNode) }[] = [
    { header: 'Room #', accessor: 'number' },
    { header: 'Status', accessor: 'status' },
    { header: 'Active', accessor: 'active' },
    { 
      header: 'Actions', 
      accessor: (r: Room) => (
        <button className="text-gold-500 text-xs font-bold hover:underline">
          Edit
        </button>
      ) 
    },
  ];

  if (loading) return <div className="p-6 text-white">Loading...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Room Configuration</h1>
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
      <Table data={rooms} columns={columns} />
    </div>
  );
}
