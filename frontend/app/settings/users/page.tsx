'use client';

import React, { useState, useEffect } from 'react';
import { api, getToken } from '@/lib/api';
import { User } from '@/lib/types';

// Pàgina d'usuaris — llista + formulari de creació/edició (CRUD complet)
export default function UsersPage() {
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulari (crear/editar)
  const [editingId, setEditingId] = useState<string | null>(null); // null = mode crear
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'reception',
    password: '',
  });

  // Traduccions trilingües (useState local — lib/i18n.ts no té hook)
  const pageT = {
    ca: {
      title: 'Gestió d\'usuaris',
      new: '+ Nou usuari',
      columns: { name: 'Nom', email: 'Correu', role: 'Rol', actions: 'Accions' },
      roles: { owner: 'Propietari', admin: 'Administrador', manager: 'Gestor', reception: 'Recepció', housekeeping: 'Neteja', accounting: 'Comptabilitat' },
      form: { create: 'Crear usuari', edit: 'Editar usuari', name: 'Nom', email: 'Correu electrònic', role: 'Rol', password: 'Contrasenya (només per a nous usuaris)', save: 'Guardar', cancel: 'Cancel·lar', confirmDel: 'Segur que vols esborrar aquest usuari?' },
      err: 'Error carregant usuaris (backend no disponible?)',
      empty: 'No hi ha usuaris',
    },
    es: {
      title: 'Gestión de usuarios',
      new: '+ Nuevo usuario',
      columns: { name: 'Nombre', email: 'Correo', role: 'Rol', password: 'Contraseña', },
      roles: { owner: 'Propietario', admin: 'Administrador', manager: 'Gestor', reception: 'Recepción', housekeeping: 'Limpieza', accounting: 'Contabilidad' },
      form: { create: 'Crear usuario', edit: 'Editar usuario', name: 'Nombre', email: 'Correo electrónico', role: 'Rol', password: 'Contraseña (solo nuevo)', save: 'Guardar', cancel: 'Cancelar', confirmDel: '¿Seguro que quieres eliminar este usuario?' },
      err: 'Error cargando usuarios (backend no disponible)',
      empty: 'No hay usuarios',
    },
    en: {
      title: 'User management',
      new: '+ New user',
      columns: { name: 'Name', email: 'Email', role: 'Role' },
      roles: { owner: 'Owner', admin: 'Administrator', manager: 'Manager', reception: 'Reception', housekeeping: 'Housekeeping', accounting: 'Accounting' },
      form: { create: 'Create user', edit: 'Edit user', name: 'Name', email: 'Email', role: 'Role', password: 'Password (new users only)', save: 'Save', cancel: 'Cancel', confirmDel: 'Delete this user?' },
      err: 'Error loading users (backend unavailable?)',
      empty: 'No users found',
    },
  }[lang];

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      setError(null);
      const data = await api.users.list();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(pageT.err);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(pageT.form.confirmDel)) return;
    try {
      await api.users.remove(id);
      await loadUsers();
    } catch (e) {
      console.error(e);
    }
  }

  function openEdit(u: User) {
    setEditingId(u.id);
    setForm({ name: u.name, email: u.email, role: u.role, password: '' });
  }

  function openCreate() {
    setEditingId(null);
    setForm({ name: '', email: '', role: 'reception', password: '' });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        // Edició: sense password (el backend la gestiona per altres mitjans)
        await api.users.update(editingId, { name: form.name, email: form.email, role: form.role });
      } else {
        // Creació: amb password (POST /api/v1/users, només owner/admin)
        await api.users.create({ name: form.name, email: form.email, role: form.role, password: form.password });
      }
      setShowForm(false);
      await loadUsers();
    } catch (e) {
      console.error(e);
      alert('Error saving user');
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">{pageT.title}</h1>
          <div className="flex gap-1 mt-2">
            {(['ca', 'es', 'en'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`px-2 py-1 text-xs rounded ${lang === l ? 'bg-[#e2b04a] text-[#1a1a2e] font-bold' : 'bg-slate-800 text-slate-400'}`}>{l.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <button onClick={() => { setEditingId(null); setForm({ name: '', email: '', role: 'reception', password: '' }); setShowForm(true); }} className="px-4 py-2 bg-[#e2b04a] text-[#1a1a2e] font-bold rounded hover:bg-[#cfa03a]">
          {pageT.new}
        </button>
      </div>

      {error && <div className="p-3 rounded bg-red-900/40 border border-red-700 text-red-200 text-sm">{error}</div>}

      {/* Taula d'usuaris */}
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm text-left text-slate-300">
          <thead className="text-xs uppercase bg-slate-800 text-slate-400">
            <tr>
              <th className="px-4 py-3">{pageT.columns.name}</th>
              <th className="px-4 py-3">{pageT.columns.email}</th>
              <th className="px-4 py-3">{pageT.columns.role}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#16213e] text-[#e2b04a]">
                    {pageT.roles[u.role as keyof typeof pageT.roles] || u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button onClick={() => openEdit(u)} className="text-[#e2b04a] hover:underline text-xs font-bold">Edit</button>
                  <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:underline text-xs font-bold">Delete</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && !error && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">—</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Formulari crear/editar (modal) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#16213e] rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-700">
            <h2 className="text-xl font-bold text-[#e2b04a] mb-6">{editingId ? pageT.form.edit : pageT.form.create}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{pageT.form.name}</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full p-2.5 rounded-lg bg-[#1a1a2e] border border-slate-700 text-white focus:ring-2 focus:ring-[#e2b04a] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{pageT.form.email}</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full p-2.5 rounded-lg bg-[#1a1a2e] border border-slate-700 text-white focus:ring-2 focus:ring-[#e2b04a] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">{pageT.form.role}</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full p-2.5 rounded-lg bg-[#1a1a2e] border border-slate-700 text-white focus:ring-2 focus:ring-[#e2b04a] outline-none">
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="reception">Reception</option>
                  <option value="housekeeping">Housekeeping</option>
                  <option value="accounting">Accounting</option>
                </select>
              </div>
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{pageT.form.password}</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} className="w-full p-2.5 rounded-lg bg-[#1a1a2e] border border-slate-700 text-white focus:ring-2 focus:ring-[#e2b04a] outline-none" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 rounded-lg bg-[#e2b04a] text-[#1a1a2e] font-bold hover:bg-[#cfa03a]">{pageT.form.save}</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600">{pageT.form.cancel}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}