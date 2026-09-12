'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import { Room, RoomType, Property } from '@/lib/types';

const STATUSES = ['clean', 'dirty', 'inspected', 'blocked', 'out_of_service'] as const;

const T = {
  ca: {
    title: 'Habitacions',
    subtitle: 'Inventari d\'habitacions i manteniment',
    add: '+ Nova habitació',
    colNumber: 'Número',
    colFloor: 'Planta',
    colType: 'Tipus',
    colFeatures: 'Característiques',
    colStatus: 'Estat',
    colActive: 'Activa',
    colActions: 'Accions',
    edit: 'Editar',
    delete: 'Esborrar',
    save: 'Desa',
    cancel: 'Cancel·la',
    createTitle: 'Nova habitació',
    editTitle: 'Editar habitació',
    property: 'Propietat',
    roomType: 'Tipus d\'habitació',
    number: 'Número',
    floor: 'Planta',
    features: 'Característiques (separades per comes)',
    status: 'Estat',
    active: 'Activa',
    selectProperty: '— Selecciona propietat —',
    selectType: '— Selecciona tipus —',
    confirmDelete: 'Segur que vols esborrar aquesta habitació?',
    loading: 'Carregant…',
    noRooms: 'Encara no hi ha cap habitació.',
    noTypes: 'Crea primer un tipus d\'habitació a Ajustos → Tipus d\'habitació.',
    noProperties: 'Crea primer una propietat a Ajustos → Propietats.',
    statusLabels: {
      clean: 'Neta',
      dirty: 'Bruta',
      inspected: 'Revisada',
      blocked: 'Bloquejada',
      out_of_service: 'Fora de servei',
    },
    capacity: 'capacitat',
  },
  es: {
    title: 'Habitaciones',
    subtitle: 'Inventario de habitaciones y mantenimiento',
    add: '+ Nueva habitación',
    colNumber: 'Número',
    colFloor: 'Planta',
    colType: 'Tipo',
    colFeatures: 'Características',
    colStatus: 'Estado',
    colActive: 'Activa',
    colActions: 'Acciones',
    edit: 'Editar',
    delete: 'Eliminar',
    save: 'Guardar',
    cancel: 'Cancelar',
    createTitle: 'Nueva habitación',
    editTitle: 'Editar habitación',
    property: 'Propiedad',
    roomType: 'Tipo de habitación',
    number: 'Número',
    floor: 'Planta',
    features: 'Características (separadas por comas)',
    status: 'Estado',
    active: 'Activa',
    selectProperty: '— Selecciona propiedad —',
    selectType: '— Selecciona tipo —',
    confirmDelete: '¿Seguro que quieres eliminar esta habitación?',
    loading: 'Cargando…',
    noRooms: 'Todavía no hay ninguna habitación.',
    noTypes: 'Crea primero un tipo de habitación en Ajustes → Tipos de habitación.',
    noProperties: 'Crea primero una propiedad en Ajustes → Propiedades.',
    statusLabels: {
      clean: 'Limpia',
      dirty: 'Sucia',
      inspected: 'Inspeccionada',
      blocked: 'Bloqueada',
      out_of_service: 'Fuera de servicio',
    },
    capacity: 'capacidad',
  },
  en: {
    title: 'Rooms',
    subtitle: 'Room inventory and maintenance',
    add: '+ New room',
    colNumber: 'Number',
    colFloor: 'Floor',
    colType: 'Type',
    colFeatures: 'Features',
    colStatus: 'Status',
    colActive: 'Active',
    colActions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    createTitle: 'New room',
    editTitle: 'Edit room',
    property: 'Property',
    roomType: 'Room type',
    number: 'Number',
    floor: 'Floor',
    features: 'Features (comma-separated)',
    status: 'Status',
    active: 'Active',
    selectProperty: '— Select property —',
    selectType: '— Select type —',
    confirmDelete: 'Are you sure you want to delete this room?',
    loading: 'Loading…',
    noRooms: 'There are no rooms yet.',
    noTypes: 'Create a room type first in Settings → Room types.',
    noProperties: 'Create a property first in Settings → Properties.',
    statusLabels: {
      clean: 'Clean',
      dirty: 'Dirty',
      inspected: 'Inspected',
      blocked: 'Blocked',
      out_of_service: 'Out of service',
    },
    capacity: 'capacity',
  },
} as const;

type Lang = keyof typeof T;

const EMPTY_FORM = {
  property_id: '',
  room_type_id: '',
  number: '',
  floor: '',
  featuresText: '',
  status: 'clean' as string,
  active: true,
};

export default function RoomsPage() {
  const [lang, setLang] = useState<Lang>('ca');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const t = T[lang];

  const typeById = useMemo(() => {
    const m = new Map<string, RoomType>();
    roomTypes.forEach((rt) => m.set(rt.id, rt));
    return m;
  }, [roomTypes]);

  const propertyById = useMemo(() => {
    const m = new Map<string, Property>();
    properties.forEach((p) => m.set(p.id, p));
    return m;
  }, [properties]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [r, rt, p] = await Promise.all([
        api.rooms.list(),
        api.roomTypes.list(),
        api.properties.list(),
      ]);
      setRooms(Array.isArray(r) ? r : []);
      setRoomTypes(Array.isArray(rt) ? rt : []);
      setProperties(Array.isArray(p) ? p : []);
    } catch (e: any) {
      setError(e?.message || 'Error carregant les habitacions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(room: Room) {
    setEditingId(room.id);
    setForm({
      property_id: room.property_id,
      room_type_id: room.room_type_id,
      number: room.number,
      floor: room.floor || '',
      featuresText: (room.features || []).join(', '),
      status: room.status,
      active: room.active,
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const features = form.featuresText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (editingId) {
        await api.rooms.update(editingId, {
          number: form.number,
          floor: form.floor || null,
          features,
          status: form.status,
          active: form.active,
        });
      } else {
        await api.rooms.create({
          property_id: form.property_id,
          room_type_id: form.room_type_id,
          number: form.number,
          floor: form.floor || null,
          features,
          status: form.status,
          active: form.active,
        });
      }
      setShowForm(false);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Error desant');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(room: Room) {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await api.rooms.delete(room.id);
      await load();
    } catch (e: any) {
      alert(e?.message || 'Error esborrant');
    }
  }

  function capacityLabel(rt: RoomType): string {
    const base = rt.max_children > 0 ? `${rt.max_adults}+${rt.max_children}` : `${rt.max_adults}`;
    return `${base} ${t.capacity}`;
  }

  if (loading) {
    return <div className="p-8 text-slate-400">{t.loading}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{t.title}</h1>
          <p className="text-sm text-slate-400">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            {(['ca', 'es', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1.5 text-xs font-medium uppercase ${
                  lang === l ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
          >
            {t.add}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-900/40 border border-red-800 text-red-200 text-sm">
          {error}
        </div>
      )}

      {rooms.length === 0 ? (
        <div className="p-10 text-center text-slate-400 border border-dashed border-slate-700 rounded-xl">
          {t.noRooms}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-800/60 text-slate-300 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">{t.colNumber}</th>
                <th className="px-4 py-3">{t.colFloor}</th>
                <th className="px-4 py-3">{t.colType}</th>
                <th className="px-4 py-3">{t.colFeatures}</th>
                <th className="px-4 py-3">{t.colStatus}</th>
                <th className="px-4 py-3">{t.colActive}</th>
                <th className="px-4 py-3 text-right">{t.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rooms.map((room) => {
                const rt = typeById.get(room.room_type_id);
                return (
                  <tr key={room.id} className="bg-slate-900/40 hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-100">{room.number}</td>
                    <td className="px-4 py-3 text-slate-300">{room.floor || '—'}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {rt ? (
                        <div>
                          <div className="text-slate-100">{rt.name}</div>
                          <div className="text-xs text-slate-500">{capacityLabel(rt)}</div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {room.features && room.features.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {room.features.map((f, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          room.status === 'clean'
                            ? 'bg-emerald-900/50 text-emerald-300'
                            : room.status === 'dirty'
                            ? 'bg-amber-900/50 text-amber-300'
                            : room.status === 'blocked' || room.status === 'out_of_service'
                            ? 'bg-red-900/50 text-red-300'
                            : 'bg-blue-900/50 text-blue-300'
                        }`}
                      >
                        {t.statusLabels[room.status as keyof typeof t.statusLabels] || room.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {room.active ? (
                        <span className="text-emerald-400">✓</span>
                      ) : (
                        <span className="text-slate-500">✗</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEdit(room)}
                        className="px-3 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 mr-2"
                      >
                        {t.edit}
                      </button>
                      <button
                        onClick={() => handleDelete(room)}
                        className="px-3 py-1 text-xs rounded bg-red-900/50 hover:bg-red-800 text-red-200"
                      >
                        {t.delete}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">
              {editingId ? t.editTitle : t.createTitle}
            </h2>

            {properties.length === 0 && (
              <div className="p-3 rounded bg-amber-900/40 border border-amber-800 text-amber-200 text-sm">
                {t.noProperties}
              </div>
            )}
            {roomTypes.length === 0 && (
              <div className="p-3 rounded bg-amber-900/40 border border-amber-800 text-amber-200 text-sm">
                {t.noTypes}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {!editingId && (
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t.property}</label>
                  <select
                    value={form.property_id}
                    onChange={(e) => setForm({ ...form, property_id: e.target.value })}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  >
                    <option value="">{t.selectProperty}</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!editingId && (
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t.roomType}</label>
                  <select
                    value={form.room_type_id}
                    onChange={(e) => setForm({ ...form, room_type_id: e.target.value })}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  >
                    <option value="">{t.selectType}</option>
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name} ({capacityLabel(rt)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t.number}</label>
                  <input
                    type="text"
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t.floor}</label>
                  <input
                    type="text"
                    value={form.floor}
                    onChange={(e) => setForm({ ...form, floor: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">{t.features}</label>
                <input
                  type="text"
                  value={form.featuresText}
                  onChange={(e) => setForm({ ...form, featuresText: e.target.value })}
                  placeholder="Terrassa, Vistes mar, Minibar…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">{t.status}</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t.statusLabels[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                      className="h-4 w-4"
                    />
                    {t.active}
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
                >
                  {saving ? '…' : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
