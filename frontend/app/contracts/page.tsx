'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { AgencyContract, ContractAllotment, ContractAuditResult } from '@/lib/types';
import { translations } from '@/lib/i18n';

export default function ContractsPage() {
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca');
  const [contracts, setContracts] = useState<AgencyContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<AgencyContract | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [auditResId, setAuditResId] = useState('');
  const [auditResult, setAuditResult] = useState<ContractAuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<AgencyContract>>({});

  const t = translations[lang];

  useEffect(() => {
    loadContracts();
  }, []);

  async function loadContracts() {
    try {
      setLoading(true);
      const data = await api.contracts.list();
      setContracts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveContract() {
    try {
      if (selectedContract?.id) {
        await api.contracts.update(selectedContract.id, formData);
      } else {
        await api.contracts.create(formData);
      }
      await loadContracts();
      setIsEditing(false);
      setSelectedContract(null);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteContract(id: string) {
    if (confirm(t.contracts.confirm_delete)) {
      try {
        await api.contracts.remove(id);
        await loadContracts();
      } catch (e) {
        console.error(e);
      }
    }
  }

  async function handleAudit() {
    if (!auditResId) return;
    try {
      const result = await api.contracts.audit(auditResId);
      setAuditResult(result);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRelease() {
    try {
      const res = await api.contracts.release({ property_id: 'prop-1' });
      alert(`${t.contracts.released_count} ${res.released}`);
    } catch (e) {
      console.error(e);
    }
  }

  const getAuditColor = (status: ContractAuditResult['status']) => {
    switch (status) {
      case 'ok': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'on_request': return 'bg-amber-500';
      case 'released': return 'bg-gray-500';
      case 'price_discrepancy': return 'bg-orange-500';
      default: return 'bg-gray-300';
    }
  };

  if (loading) return <div className="flex justify-center p-10">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-900">
      {/* Language Selector */}
      <div className="flex justify-end space-x-2">
        {(['ca', 'es', 'en'] as const).map((l) => (
          <button 
            key={l} 
            onClick={() => setLang(l)} 
            className={`px-2 py-1 text-xs rounded ${lang === l ? 'bg-indigo-900 text-white' : 'bg-slate-200'}`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-950">{t.contracts.title}</h1>
        <div className="space-x-2">
          <button 
            onClick={() => { setFormData({}); setSelectedContract(null); setIsEditing(true); }} 
            className="bg-indigo-900 text-white px-4 py-2 rounded hover:bg-indigo-800 transition-colors"
          >
            {t.contracts.create}
          </button>
          <button 
            onClick={handleRelease} 
            className="bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600 transition-colors"
          >
            {t.contracts.release_all}
          </button>
        </div>
      </div>

      {/* Contracts Table */}
      {!isEditing && !selectedContract && (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full text-left border-collapse">
            <thead className="bg-indigo-900 text-white">
              <tr>
                <th className="p-3">{t.contracts.agency}</th>
                <th className="p-3">{t.contracts.code}</th>
                <th className="p-3">{t.contracts.validity}</th>
                <th className="p-3">{t.contracts.guarantee}</th>
                <th className="p-3">{t.contracts.active}</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(c => (
                <tr key={c.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">{c.agency_name}</td>
                  <td className="p-3">{c.code}</td>
                  <td className="p-3">{c.start_date} → {c.end_date}</td>
                  <td className="p-3">{c.guarantee_type}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${c.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.active ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="p-3 space-x-2">
                    <button onClick={() => setSelectedContract(c)} className="text-indigo-600 hover:underline">{t.contracts.view}</button>
                    <button onClick={() => { setSelectedContract(c); setFormData(c); setIsEditing(true); }} className="text-amber-600 hover:underline">{t.contracts.edit}</button>
                    <button onClick={() => handleDeleteContract(c.id)} className="text-red-600 hover:underline">{t.contracts.delete}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit/Create Form */}
      {isEditing && (
        <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-amber-500">
          <h2 className="text-xl font-bold mb-4">{selectedContract ? t.contracts.edit_title : t.contracts.create_title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium">{t.contracts.agency}</label>
              <input 
                className="border p-2 rounded" 
                value={formData.agency_name || ''} 
                onChange={e => setFormData({...formData, agency_name: e.target.value})} 
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium">{t.contracts.code}</label>
              <input 
                className="border p-2 rounded" 
                value={formData.code || ''} 
                onChange={e => setFormData({...formData, code: e.target.value})} 
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium">{t.contracts.start_date}</label>
              <input 
                type="date" 
                className="border p-2 rounded" 
                value={formData.start_date || ''} 
                onChange={e => setFormData({...formData, start_date: e.target.value})} 
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium">{t.contracts.end_date}</label>
              <input 
                type="date" 
                className="border p-2 rounded" 
                value={formData.end_date || ''} 
                onChange={e => setFormData({...formData, end_date: e.target.value})} 
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium">{t.contracts.guarantee}</label>
              <select 
                className="border p-2 rounded" 
                value={formData.guarantee_type || 'free'} 
                onChange={e => setFormData({...formData, guarantee_type: e.target.value as any})} 
              >
                <option value="free">Free</option>
                <option value="guaranteed">Guaranteed</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium">{t.contracts.commission}</label>
              <input 
                type="number" 
                className="border p-2 rounded" 
                value={formData.commission || ''} 
                onChange={e => setFormData({...formData, commission: Number(e.target.value)})} 
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">{t.contracts.cancel}</button>
            <button onClick={handleSaveContract} className="px-4 py-2 bg-indigo-900 text-white rounded hover:bg-indigo-800">{t.contracts.save}</button>
          </div>
        </div>
      )}

      {/* Detail View */}
      {selectedContract && !isEditing && (
        <div className="bg-white p-6 rounded-lg shadow border-t-4 border-indigo-900">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-indigo-950">{selectedContract.agency_name}</h2>
              <p className="text-slate-500">{selectedContract.code} | {selectedContract.start_date} → {selectedContract.end_date}</p>
            </div>
            <button onClick={() => setSelectedContract(null)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Allotments */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">{t.contracts.allotments_title}</h3>
              <div className="space-y-3">
                {selectedContract.allotments.map(a => (
                  <div key={a.id} className="p-3 border rounded flex items-center justify-between bg-slate-50">
                    <div>
                      <p className="font-medium">{a.date} - {a.room_type_id}</p>
                      <p className="text-xs text-slate-500">Rate: {a.contracted_rate}€</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-bold">{a.sold}/{a.allotment}</p>
                        <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600" 
                            style={{ width: `${(a.sold / a.allotment) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Panel */}
            <div className="bg-slate-100 p-4 rounded-lg border border-slate-200">
              <h3 className="text-lg font-semibold mb-4">{t.contracts.audit_title}</h3>
              <div className="flex space-x-2 mb-4">
                <input 
                  className="flex-1 border p-2 rounded text-sm" 
                  placeholder="Reservation ID" 
                  value={auditResId} 
                  onChange={e => setAuditResId(e.target.value)} 
                />
                <button onClick={handleAudit} className="bg-indigo-900 text-white px-3 py-2 rounded text-sm">Audit</button>
              </div>
              {auditResult && (
                <div className={`p-3 rounded border ${getAuditColor(auditResult.status)} text-white`}>
                  <p className="font-bold uppercase text-xs">{auditResult.status}</p>
                  <p className="text-sm">{auditResult.reason}</p>
                  <div className="mt-2 text-xs opacity-90">
                    <p>Contracted: {auditResult.contracted_rate}€</p>
                    <p>Applied: {auditResult.applied_rate}€</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
