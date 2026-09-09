"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Property, RoomType, RatePlan } from '@/lib/types';
import { translations } from '@/lib/i18n';

type Tab = 'properties' | 'roomTypes' | 'ratePlans';

export default function SettingsPage() {
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca');
  const [activeTab, setActiveTab] = useState<Tab>('properties');
  
  // Data states
  const [properties, setProperties] = useState<Property[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  
  // Form states
  const [propertyForm, setPropertyForm] = useState<Partial<Property>>({});
  const [roomTypeForm, setRoomTypeForm] = useState<Partial<RoomType>>({});
  const [ratePlanForm, setRatePlanForm] = useState<Partial<RatePlan>>({});
  
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const t = translations[lang];

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'properties') {
        const data = await api.properties.list();
        setProperties(data);
      } else if (activeTab === 'roomTypes') {
        const data = await api.roomTypes.list();
        setRoomTypes(data);
      } else if (activeTab === 'ratePlans') {
        const data = await api.ratePlans.list();
        setRatePlans(data);
      }
    } catch (e) {
      console.error('Error loading settings data:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProperty() {
    try {
      if (editingId) {
        await api.properties.update(editingId, propertyForm);
      } else {
        await api.properties.create(propertyForm);
      }
      setPropertyForm({});
      setEditingId(null);
      await loadData();
    } catch (e) {
      console.error('Error saving property:', e);
    }
  }

  async function handleSaveRoomType() {
    try {
      if (editingId) {
        await api.roomTypes.update(editingId, roomTypeForm);
      } else {
        await api.roomTypes.create(roomTypeForm);
      }
      setRoomTypeForm({});
      setEditingId(null);
      await loadData();
    } catch (e) {
      console.error('Error saving room type:', e);
    }
  }

  async function handleSaveRatePlan() {
    try {
      if (editingId) {
        await api.ratePlans.update(editingId, ratePlanForm);
      } else {
        await api.ratePlans.create(ratePlanForm);
      }
      setRatePlanForm({});
      setEditingId(null);
      await loadData();
    } catch (e) {
      console.error('Error saving rate plan:', e);
    }
  }

  const tabs = {
    properties: { 
      label: lang === 'ca' ? 'Propietats' : lang === 'es' ? 'Propiedades' : 'Properties',
      icon: '🏨' 
    },
    roomTypes: { 
      label: lang === 'ca' ? 'Tipus d\'habitació' : lang === 'es' ? 'Tipos de habitación' : 'Room Types',
      icon: '🛏️' 
    },
    ratePlans: { 
      label: lang === 'ca' ? 'Tarifes' : lang === 'es' ? 'Tarifas' : 'Rate Plans',
      icon: '💰' 
    },
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-[#1a1a2e]">
          {t.settings}
        </h1>
        <div className="flex gap-2">
          {(['ca', 'es', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                lang === l ? 'bg-[#e2b04a] text-[#1a1a2e]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        {(Object.keys(tabs) as Tab[]).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => {
              setActiveTab(tabKey);
              setEditingId(null);
            }}
            className={`px-6 py-3 font-medium transition-all relative ${
              activeTab === tabKey 
                ? 'text-[#e2b04a] border-b-2 border-[#e2b04a]' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>{tabs[tabKey].icon}</span>
              {tabs[tabKey].label}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e2b04a]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-[#16213e]">
              {editingId ? (lang === 'ca' ? 'Editar' : lang === 'es' ? 'Editar' : 'Edit') : (lang === 'ca' ? 'Nou' : lang === 'es' ? 'Nuevo' : 'New')} {tabs[activeTab].label}
            </h2>
            
            <div className="space-y-4">
              {activeTab === 'properties' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input 
                      className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                      value={propertyForm.name || ''}
                      onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                    <input 
                      className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                      value={propertyForm.code || ''}
                      onChange={(e) => setPropertyForm({ ...propertyForm, code: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                    <input 
                      className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                      value={propertyForm.timezone || ''}
                      onChange={(e) => setPropertyForm({ ...propertyForm, timezone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <input 
                      className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                      value={propertyForm.currency || ''}
                      onChange={(e) => setPropertyForm({ ...propertyForm, currency: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input 
                      className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                      value={typeof propertyForm.address === 'string' ? propertyForm.address : ''}
                      onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="prop-active"
                      className="w-4 h-4 text-[#e2b04a] focus:ring-[#e2b04a]"
                      checked={propertyForm.active ?? true}
                      onChange={(e) => setPropertyForm({ ...propertyForm, active: e.target.checked })}
                    />
                    <label htmlFor="prop-active" className="text-sm font-medium text-gray-700">Active</label>
                  </div>
                  <button 
                    onClick={handleSaveProperty}
                    className="w-full py-2 bg-[#1a1a2e] text-white rounded-lg font-medium hover:bg-[#16213e] transition-colors"
                  >
                    {lang === 'ca' ? 'Desar' : lang === 'es' ? 'Guardar' : 'Save'}
                  </button>
                </>
              )}

              {activeTab === 'roomTypes' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property ID</label>
                    <input 
                      className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                      value={roomTypeForm.property_id || ''}
                      onChange={(e) => setRoomTypeForm({ ...roomTypeForm, property_id: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                    <input 
                      className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                      value={roomTypeForm.code || ''}
                      onChange={(e) => setRoomTypeForm({ ...roomTypeForm, code: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input 
                      className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                      value={roomTypeForm.name || ''}
                      onChange={(e) => setRoomTypeForm({ ...roomTypeForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea 
                      className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                      value={roomTypeForm.description || ''}
                      onChange={(e) => setRoomTypeForm({ ...roomTypeForm, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Adults</label>
                      <input 
                        type="number"
                        className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                        value={roomTypeForm.max_adults || ''}
                        onChange={(e) => setRoomTypeForm({ ...roomTypeForm, max_adults: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Children</label>
                      <input 
                        type="number"
                        className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                        value={roomTypeForm.max_children || ''}
                        onChange={(e) => setRoomTypeForm({ ...roomTypeForm, max_children: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Occupancy</label>
                    <input 
                      type="number"
                      className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                      value={roomTypeForm.base_occupancy || ''}
                      onChange={(e) => setRoomTypeForm({ ...roomTypeForm, base_occupancy: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="rt-active"
                      className="w-4 h-4 text-[#e2b04a] focus:ring-[#e2b04a]"
                      checked={roomTypeForm.active ?? true}
                      onChange={(e) => setRoomTypeForm({ ...roomTypeForm, active: e.target.checked })}
                    />
                    <label htmlFor="rt-active" className="text-sm font-medium text-gray-700">Active</label>
                  </div>
                  <button 
                    onClick={handleSaveRoomType}
                    className="w-full py-2 bg-[#1a1a2e] text-white rounded-lg font-medium hover:bg-[#16213e] transition-colors"
                  >
                    {lang === 'ca' ? 'Desar' : lang === 'es' ? 'Guardar' : 'Save'}
                  </button>
                </>
              )}

              {activeTab === 'ratePlans' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property ID</label>
                    <input 
                      className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                      value={ratePlanForm.property_id || ''}
                      onChange={(e) => setRatePlanForm({ ...ratePlanForm, property_id: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                    <input 
                      className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                      value={ratePlanForm.code || ''}
                      onChange={(e) => setRatePlanForm({ ...ratePlanForm, code: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input 
                      className="w-full p-2 border rounded bg-gray-50 font-medium text-gray-700 mb-1 la focus:ring-2 focus:ring-[#e2b04a] outline-none"
                      value={ratePlanForm.name || ''}
                      onChange={(e) => setRatePlanForm({ ...ratePlanForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea 
                      className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                      value={ratePlanForm.description || ''}
                      onChange={(e) => setRatePlanForm({ ...ratePlanForm, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Stay</label>
                      <input 
                        type="number"
                        className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                        value={ratePlanForm.min_stay || ''}
                        onChange={(e) => setRatePlanForm({ ...ratePlanForm, min_stay: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Stay</label>
                      <input 
                        type="number"
                        className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                        value={ratePlanForm.max_stay || ''}
                        onChange={(e) => setRatePlanForm({ ...ratePlanForm, max_stay: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Policies</label>
                    <textarea 
                      className="w-full p-2 border rounded bg-gray-50 focus:ring-2 focus:ring-[#e2b04a] outline-none"
                      value={typeof ratePlanForm.policies === 'string' ? ratePlanForm.policies : ''}
                      onChange={(e) => setRatePlanForm({ ...ratePlanForm, policies: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="rp-active"
                      className="w-4 h-4 text-[#e2b04a] focus:ring-[#e2b04a]"
                      checked={ratePlanForm.active ?? true}
                      onChange={(e) => setRatePlanForm({ ...ratePlanForm, active: e.target.checked })}
                    />
                    <label htmlFor="rp-active" className="text-sm font-medium text-gray-700">Active</label>
                  </div>
                  <button 
                    onClick={handleSaveRatePlan}
                    className="w-full py-2 bg-[#1a1a2e] text-white rounded-lg font-medium hover:bg-[#16213e] transition-colors"
                  >
                    {lang === 'ca' ? 'Desar' : lang === 'es' ? 'Guardar' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* List Section */}
          <div className="lg:col-span-2 overflow-x-auto">
            <table className="w-full text-left border-collapse bg-white rounded-xl shadow-sm overflow-hidden">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {activeTab === 'properties' && (
                    <>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600">Name</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600">Code</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600">Active</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600">Actions</th>
                    </>
                  )}
                  {activeTab === 'roomTypes' && (
                    <>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600">Name</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600">Code</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600">Max Occ</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600">Active</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600">Actions</th>
                    </>
                  )}
                  {activeTab === 'ratePlans' && (
                    <>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600">Name</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600">Code</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600">Stay</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600">Active</th>
                      <th className="px-4 py-3 text-sm font-semibold text-gray-600">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {activeTab === 'properties' && properties.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700">{p.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{p.code}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {p.active ? (lang === 'ca' ? 'Actiu' : lang === 'es' ? 'Activo' : 'Active') : (lang === 'ca' ? 'Inactiu' : lang === 'es' ? 'Inactivo' : 'Inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button 
                        onClick={() => {
                          setEditingId(p.id);
                          setPropertyForm(p);
                        }}
                        className="text-[#e2b04a] font-medium hover:underline mr-3"
                      >
                        {lang === 'ca' ? 'Editar' : lang === 'es' ? 'Editar' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                ))}
                {activeTab === 'roomTypes' && roomTypes.map((rt) => (
                  <tr key={rt.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700">{rt.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{rt.code}</td>
                    <td className="px-4 py-3 text-sm">{rt.max_adults + rt.max_children}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${rt.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {rt.active ? (lang === 'ca' ? 'Actiu' : lang === 'es' ? 'Activo' : 'Active') : (lang === 'ca' ? 'Inactiu' : lang === 'es' ? 'Inactivo' : 'Inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button 
                        onClick={() => {
                          setEditingId(rt.id);
                          setRoomTypeForm(rt);
                        }}
                        className="text-[#e2b04a] font-medium hover:underline mr-3"
                      >
                        {lang === 'ca' ? 'Editar' : lang === 'es' ? 'Editar' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                ))}
                {activeTab === 'ratePlans' && ratePlans.map((rp) => (
                  <tr key={rp.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700">{rp.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{rp.code}</td>
                    <td className="px-4 py-3 text-sm">{rp.min_stay}-{rp.max_stay || '∞'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${rp.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {rp.active ? (lang === 'ca' ? 'Actiu' : lang === 'es' ? 'Activo' : 'Active') : (lang === 'ca' ? 'Inactiu' : lang === 'es' ? 'Inactivo' : 'Inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button 
                        onClick={() => {
                          setEditingId(rp.id);
                          setRatePlanForm(rp);
                        }}
                        className="text-[#e2b04a] font-medium hover:underline mr-3"
                      >
                        {lang === 'ca' ? 'Editar' : lang === 'es' ? 'Editar' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}