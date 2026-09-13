'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Guest } from '@/lib/types';
import DocumentReader from '@/components/DocumentReader';

const EMPTY = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  document_type: '',
  document_number: '',
  birth_date: '',
  nationality: '',
  sex: '',
  country_of_residence: '',
  notes: '',
};

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try {
      const data = await api.guests.list();
      setGuests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error loading guests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const applyParsed = (fields: any) => {
    setForm((f) => ({
      ...f,
      first_name: fields.first_name ?? f.first_name,
      last_name: fields.last_name ?? f.last_name,
      document_type: fields.document_type ?? f.document_type,
      document_number: fields.document_number ?? f.document_number,
      birth_date: fields.birth_date ?? f.birth_date,
      nationality: fields.nationality ?? f.nationality,
      sex: fields.sex ?? f.sex,
    }));
  };

  const save = async () => {
    if (!form.first_name || !form.last_name) {
      setError('Cal omplir nom i cognoms');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // tenant_id s'obté de la primera propietat (tots els guests hi pertanyen).
      const props = await api.properties.list();
      const tenantId = props?.[0]?.tenant_id;
      if (!tenantId) throw new Error('No hi ha propietat/tenant configurat');
      await api.guests.create({
        tenant_id: tenantId,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        document_type: form.document_type || undefined,
        document_number: form.document_number || undefined,
        birth_date: form.birth_date || undefined,
        nationality: form.nationality || undefined,
        sex: form.sex || undefined,
        country_of_residence: form.country_of_residence || undefined,
        notes: form.notes || undefined,
      });
      setShowForm(false);
      setForm(EMPTY);
      await reload();
    } catch (e: any) {
      setError(e?.detail || e?.message || 'Error creant el client');
    } finally {
      setSaving(false);
    }
  };

  const input = (k: string, label: string, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs text-slate-400 uppercase font-bold mb-1">{label}</label>
      <input
        type={type}
        value={form[k] ?? ''}
        onChange={(e) => setField(k, e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
      />
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#e2b04a] text-[#1a1a2e] px-4 py-2 rounded font-medium hover:bg-[#d4a03a] transition-colors"
        >
          + Nou client
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">Carregant...</div>
      ) : (
        <div className="bg-slate-900 rounded-lg shadow overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1a1a2e] text-white">
              <tr>
                <th className="p-4 font-medium">Nom</th>
                <th className="p-4 font-medium">Document</th>
                <th className="p-4 font-medium">Nacionalitat</th>
                <th className="p-4 font-medium">Naixement</th>
              </tr>
            </thead>
            <tbody>
              {guests.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-slate-400">No hi ha clients.</td></tr>
              ) : (
                guests.map((g) => (
                  <tr key={g.id} className="border-b border-slate-800 hover:bg-slate-800/60">
                    <td className="p-4 text-white font-medium">{g.first_name} {g.last_name}</td>
                    <td className="p-4 text-slate-300">{g.document_type} {g.document_number || ''}</td>
                    <td className="p-4 text-slate-300">{g.nationality || '—'}</td>
                    <td className="p-4 text-slate-300">{g.birth_date || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div
            className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Nou client</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="p-5 space-y-4">
              <DocumentReader onParsed={applyParsed} />

              <div className="grid grid-cols-2 gap-4">
                {input('first_name', 'Nom *')}
                {input('last_name', 'Cognoms *')}
                {input('document_type', 'Tipus document', 'text', 'PASSPORT / DNI')}
                {input('document_number', 'Número document')}
                {input('birth_date', 'Naixement', 'date')}
                {input('nationality', 'Nacionalitat (ISO)', 'text', 'ESP')}
                {input('sex', 'Sexe', 'text', 'M / F / X')}
                {input('country_of_residence', 'País residència (ISO)', 'text', 'ESP')}
                {input('email', 'Email', 'email')}
                {input('phone', 'Telèfon', 'tel')}
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-slate-700">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-600 text-slate-300 rounded hover:bg-slate-800">
                Cancel·lar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 bg-[#e2b04a] text-[#1a1a2e] rounded font-medium hover:bg-[#d4a03a] disabled:opacity-50"
              >
                {saving ? 'Desant...' : 'Guardar client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
