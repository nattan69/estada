'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { translations } from '@/lib/i18n';
import { MaintenanceTask, MaintenanceStatus, Room } from '@/lib/types';

export default function MaintenancePage() {
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca');
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    room_id: '',
    type: '',
    description: '',
    priority: 3,
  });

  const t = translations[lang];

  const mT = {
    ca: {
      title: 'Manteniment',
      create: 'Nou Part de Manteniment',
      room: 'Habitació',
      type: 'Tipus',
      description: 'Descripció',
      priority: 'Prioritat',
      status: 'Estat',
      resolve: 'Resoldre',
      save: 'Desar',
      cancel: 'Cancel·lar',
      priorityLabels: { 1: 'Urgent', 2: 'Alta', 3: 'Normal' },
      statusLabels: { 
        all: 'Tots', 
        pendent: 'Pendent', 
        en_curs: 'En curs', 
        en_espera_peca: 'Espera peça', 
        resolt: 'Resolt', 
        cancelat: 'Cancel·lat' 
      },
      placeholderType: 'ex: Electricitat, Plomeria...',
      placeholderDesc: 'Detalls de la avaria...',
    },
    es: {
      title: 'Mantenimiento',
      create: 'Nuevo Parte de Mantenimiento',
      room: 'Habitación',
      type: 'Tipo',
      description: 'Descripción',
      priority: 'Prioridad',
      status: 'Estado',
      resolve: 'Resolver',
      save: 'Guardar',
      cancel: 'Cancelar',
      priorityLabels: { 1: 'Urgente', 2: 'Alta', 3: 'Normal' },
      statusLabels: { 
        all: 'Todos', 
        pendent: 'Pendiente', 
        en_curs: 'En curso', 
        en_espera_pieza: 'Espera pieza', 
        resolt: 'Resuelto', 
        cancelat: 'Cancelado' 
      },
      placeholderType: 'ej: Electricidad, Fontanería...',
      placeholderDesc: 'Detalles de la avería...',
    },
    en: {
      title: 'Maintenance',
      create: 'New Maintenance Task',
      room: 'Room',
      type: 'Type',
      description: 'Description',
      priority: 'Priority',
      status: 'Status',
      resolve: 'Resolve',
      save: 'Save',
      cancel: 'Cancel',
      priorityLabels: { 1: 'Urgent', 2: 'High', 3: 'Normal' },
      statusLabels: { 
        all: 'All', 
        pendent: 'Pending', 
        en_curs: 'In Progress', 
        en_espera_peca: 'Waiting Part', 
        resolt: 'Resolved', 
        cancelat: 'Cancelled' 
      },
      placeholderType: 'e.g. Electricity, Plumbing...',
      placeholderDesc: 'Details of the issue...',
    },
  }[lang];

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [tasksData, roomsData] = await Promise.all([
          api.maintenance.list(),
          api.rooms.list()
        ]);
        setTasks(tasksData);
        setRooms(roomsData);
      } catch (e) {
        console.error('Error loading maintenance data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newTask = await api.maintenance.create({
        ...formData,
        property_id: tasks[0]?.property_id || 'prop-1',
      });
      setTasks([newTask, ...tasks]);
      setShowForm(false);
      setFormData({ room_id: '', type: '', description: '', priority: 3 });
    } catch (e) {
      console.error('Error creating task:', e);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      const updated = await api.maintenance.resolve(id);
      setTasks(tasks.map(t => t.id === id ? updated : t));
    } catch (e) {
      console.error('Error resolving task:', e);
    }
  };

  const filteredTasks = filterStatus === 'all' 
    ? tasks 
    : tasks.filter(t => t.status === filterStatus);

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'bg-red-100 text-red-800 border-red-200';
    if (priority === 2) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  if (loading) return <div className="p-8 text-center text-slate-600">Carregant...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1a1a2e]">{mT.title}</h1>
          <p className="text-slate-500">Gestió de parts de manteniment</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value as any)}
            className="p-2 border rounded bg-white text-sm"
          >
            <option value="ca">CA</option>
            <option value="es">ES</option>
            <option value="en">EN</option>
          </select>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-[#e2b04a] hover:bg-[#cfa83d] text-[#1a1a2e] font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            + {mT.create}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 text-[#1a1a2e]">{mT.create}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{mT.room}</label>
                <select 
                  required
                  value={formData.room_id}
                  onChange={e => setFormData({...formData, room_id: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#e2b04a] outline-none"
                >
                  <option value="">{mT.room}...</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{mT.type}</label>
                <input 
                  required
                  type="text"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  placeholder={mT.placeholderType}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#e2b04a] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{mT.description}</label>
                <textarea 
                  required
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder={mT.placeholderDesc}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#e2b04a] outline-none h-24"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{mT.priority}</label>
                <div className="flex gap-4">
                  {[1, 2, 3].map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="priority" 
                        value={p} 
                        checked={formData.priority === p}
                        onChange={() => setFormData({...formData, priority: p})}
                        className="text-[#e2b04a] focus:ring-[#e2b04a]"
                      />
                      <span className="text-sm text-slate-600">{mT.priorityLabels[p as keyof typeof mT.priorityLabels]}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {mT.cancel}
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-[#1a1a2e] text-white rounded-lg hover:bg-[#16213e] transition-colors"
                >
                  {mT.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center gap-4 overflow-x-auto pb-2">
        <span className="text-sm font-medium text-slate-500 whitespace-nowrap">
          {lang === 'ca' ? 'Filtre estat:' : lang === 'es' ? 'Filtro estado:' : 'Status filter:'}
        </span>
        <div className="flex gap-2">
          {Object.entries(mT.statusLabels).map(([key, label]) => {
            if (key === 'all') return null;
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  filterStatus === key 
                    ? 'bg-[#1a1a2e] text-white' 
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed">
            No hi ha parts de manteniment amb aquest filtre.
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-start hover:shadow-md transition-shadow">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg text-[#1a1a2e]">Habitació {rooms.find(r => r.id === task.room_id)?.number || '???'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getPriorityColor(task.priority)}`}>
                    {mT.priorityLabels[task.priority as keyof typeof mT.priorityLabels]}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                    {mT.statusLabels[task.status as keyof typeof mT.statusLabels] || task.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-700">{task.type}</p>
                <p className="text-sm text-slate-600">{task.description}</p>
                <p className="text-[10px] text-slate-400 italic">
                  Reportat el {new Date(task.reported_at).toLocaleDateString()}
                </p>
              </div>
              {task.status !== 'resolt' && task.status !== 'cancelat' && (
                <button 
                  onClick={() => handleResolve(task.id)}
                  className="px-3 py-1.5 bg-white border border-[#e2b04a] text-[#e2b04a] hover:bg-[#e2b04a] hover:text-white text-xs font-bold rounded-lg transition-all"
                >
                  {mT.resolve}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
