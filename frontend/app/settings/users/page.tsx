'use client';

import React, { useEffect, useState } from 'react';
import { Table } from '@/components/ui/table';
import { api } from '@/lib/api';
import { User } from '@/lib/types';
import { translations } from '@/lib/i18n';

export default function UsersSettingsPage() {
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true);
        const data = await api.users.list();
        setUsers(data);
      } catch (e) {
        setError('Error carregant usuaris');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  const t = translations[lang];

  const columns: { header: string; accessor: keyof User | ((u: User) => React.ReactNode) }[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Role', accessor: 'role' },
    { 
      header: 'Actions', 
      accessor: (u: User) => (
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
        <h1 className="text-2xl font-bold text-white">User Management</h1>
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
      <Table data={users} columns={columns} />
    </div>
  );
}
