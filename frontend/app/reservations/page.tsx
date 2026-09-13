'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Reservation, ReservationStatus } from '@/lib/types';
import { useWorkspace } from '@/components/WorkspaceBar';
import Link from 'next/link';

type SortKey = 'confirmation_code' | 'guest_id' | 'check_in' | 'check_out' | 'status';

const STATUSES: ReservationStatus[] = ['quote', 'confirmed', 'checked_in', 'checked_out', 'canceled', 'no_show'];

export default function ReservationsPage() {
  const { propertyId } = useWorkspace();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('check_in');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [form, setForm] = useState<Partial<Reservation>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const reload = async () => {
    const data = await api.reservations.list({ propertyId: propertyId ?? undefined });
    setReservations(data);
  };

  useEffect(() => {
    if (!propertyId) return;
    async function load() {
      try {
        setLoading(true);
        await reload();
      } catch (e) {
        console.error('Error loading reservations:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [propertyId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = reservations;
    if (q) {
      list = list.filter((r) =>
        (r.confirmation_code || '').toLowerCase().includes(q) ||
        (r.guest_name || '').toLowerCase().includes(q) ||
        (r.guest_id || '').toLowerCase().includes(q) ||
        (r.status || '').toLowerCase().includes(q) ||
        (r.check_in || '').includes(q) ||
        (r.check_out || '').includes(q)
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      const av = (a[sortKey] ?? '') as string;
      const bv = (b[sortKey] ?? '') as string;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return list;
  }, [reservations, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  const openModal = (r: Reservation) => {
    setSelected(r);
    setForm({ ...r });
    setSaveError(null);
  };

  const closeModal = () => { setSelected(null); setForm({}); };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    try {
      await api.reservations.update(selected.id, form);
      await reload();
      closeModal();
    } catch (e) {
      console.error(e);
      setSaveError('Error desant la reserva');
    } finally {
      setSaving(false);
    }
  };

  const field = (k: keyof Reservation, label: string, type: string = 'text') => (
    <div>
      <label className="block text-xs text-slate-400 uppercase font-bold mb-1">{label}</label>
      <input
        type={type}
        value={(form[k] as any) ?? ''}
        onChange={(e) => setForm({ ...form, [k]: type === 'number' ? Number(e.target.value) : e.target.value })}
        className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
      />
    </div>
  );

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      confirmed: 'bg-green-100 text-green-800',
      checked_in: 'bg-blue-100 text-blue-800',
      checked_out: 'bg-gray-100 text-gray-800',
      canceled: 'bg-red-100 text-red-800',
      no_show: 'bg-amber-100 text-amber-800',
      quote: 'bg-purple-100 text-purple-800',
    };
    return map[s] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Reserves</h1>
        <div className="flex gap-3 items-center">
          {/* Cercador tipus Google */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cercar per codi, hòspit, estatus, data..."
              className="pl-9 pr-8 py-2 w-72 rounded-full bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-[#e2b04a]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                ×
              </button>
            )}
          </div>
          <Link
            href="/reservations/new"
            className="bg-[#e2b04a] text-[#1a1a2e] px-4 py-2 rounded font-medium hover:bg-[#d4a03a] transition-colors"
          >
            + Nova Reserva
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">Carregant...</div>
      ) : (
        <div className="bg-slate-900 rounded-lg shadow overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1a1a2e] text-white">
              <tr>
                {([
                  ['confirmation_code', 'Codi'],
                  ['guest_id', 'Hòspit'],
                  ['check_in', 'Check-in'],
                  ['check_out', 'Check-out'],
                  ['status', 'Estatus'],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="p-4 font-medium cursor-pointer select-none hover:text-[#e2b04a] transition-colors"
                    title="Clic per ordenar"
                  >
                    {label}{sortArrow(key)}
                  </th>
                ))}
                <th className="p-4 font-medium text-right">Acció</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    No s'han trobat reserves.
                  </td>
                </tr>
              ) : (
                filtered.map((res) => (
                  <tr
                    key={res.id}
                    onDoubleClick={() => openModal(res)}
                    className="border-b border-slate-800 hover:bg-slate-800/60 transition-colors cursor-default"
                    title="Doble clic per editar"
                  >
                    <td className="p-4 font-mono text-sm text-white">{res.confirmation_code}</td>
                    <td className="p-4 text-slate-300">{res.guest_name || res.guest_id}</td>
                    <td className="p-4 text-slate-300">{res.check_in}</td>
                    <td className="p-4 text-slate-300">{res.check_out}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(res.status)}`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openModal(res)}
                        className="text-[#e2b04a] hover:text-white font-medium transition-colors"
                      >
                        Edita
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal CRUD */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-slate-700">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Reserva {selected.confirmation_code}
                </h2>
                {selected.guest_name && (
                  <p className="text-sm text-slate-400 mt-1">👤 {selected.guest_name}</p>
                )}
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="p-5 grid grid-cols-2 gap-4">
              {field('check_in', 'Check-in', 'date')}
              {field('check_out', 'Check-out', 'date')}
              {field('adults', 'Adults', 'number')}
              {field('children', 'Nins', 'number')}
              <div>
                <label className="block text-xs text-slate-400 uppercase font-bold mb-1">Estatus</label>
                <select
                  value={form.status ?? ''}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ReservationStatus })}
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 uppercase font-bold mb-1">Origen</label>
                <input
                  type="text"
                  value={(form.source as string) ?? ''}
                  onChange={(e) => setForm({ ...form, source: e.target.value as any })}
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 uppercase font-bold mb-1">Notes</label>
                <textarea
                  value={(form.notes as string) ?? ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
                />
              </div>
            </div>

            {saveError && <div className="px-5 pb-2 text-red-400 text-sm">{saveError}</div>}

            <div className="flex justify-end gap-3 p-5 border-t border-slate-700">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-slate-600 text-slate-300 rounded hover:bg-slate-800 transition-colors"
              >
                Cancel·lar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 bg-[#e2b04a] text-[#1a1a2e] rounded font-medium hover:bg-[#d4a03a] disabled:opacity-50 transition-colors"
              >
                {saving ? 'Desant...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
