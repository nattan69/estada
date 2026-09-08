import React, { useState, useMemo } from 'react';
import { MaintenanceTask, MaintenanceStatus } from '@/lib/types';

// MOCKS de dades per al desenvolupament
const MOCK_ROOMS = [
  { id: 'r1', number: '101' },
  { id: 'r2', number: '102' },
  { id: 'r3', number: '103' },
  { id: 'r4', number: '104' },
];

const MOCK_MAINTENANCE_TASKS: MaintenanceTask[] = [
  {
    id: 'mt1',
    property_id: 'p1',
    room_id: 'r1',
    type: 'Aire condicionat',
    description: 'No refreda prou, possible fuita de gas',
    priority: 2,
    status: 'pendent',
    created_by_id: 'u1',
    reported_at: '2026-09-05T10:00:00Z',
    created_at: '2026-09-05T10:00:00Z',
    updated_at: '2026-09-05T10:00:00Z',
  },
  {
    id: 'mt2',
    property_id: 'p1',
    room_id: 'r2',
    type: 'Plomeria',
    description: 'Gotera a la aixeta del bany',
    priority: 3,
    status: 'en_curs',
    created_by_id: 'u1',
    reported_at: '2026-09-06T12:00:00Z',
    created_at: '2026-09-06T12:00:00Z',
    updated_at: '2026-09-06T12:00:00Z',
  },
  {
    id: 'mt3',
    property_id: 'p1',
    room_id: 'r3',
    type: 'Electricitat',
    description: 'Endorrer no funciona al costat del llit',
    priority: 1,
    status: 'en_espera_peca',
    created_by_id: 'u2',
    reported_at: '2026-09-07T08:30:00Z',
    created_at: '2026-09-07T08:30:00Z',
    updated_at: '2026-09-07T08:30:00Z',
  },
];

const STATUS_COLORS: Record<MaintenanceStatus, string> = {
  pendent: 'bg-blue-500',
  en_curs: 'bg-amber-500',
  en_espera_peca: 'bg-orange-500',
  resolt: 'bg-green-500',
  cancelat: 'bg-gray-500',
};

const STATUS_LABELS: Record<string, Record<MaintenanceStatus, string>> = {
  ca: {
    pendent: 'Pendent',
    en_curs: 'En curs',
    en_espera_peca: 'Esperant peça',
    resolt: 'Resolt',
    cancelat: 'Cancelat',
  },
  es: {
    pendent: 'Pendiente',
    en_curs: 'En curso',
    en_espera_peca: 'Esperando pieza',
    resolt: 'Resuelto',
    cancelat: 'Cancelado',
  },
  en: {
    pendent: 'Pending',
    en_curs: 'In progress',
    en_espera_peca: 'Awaiting part',
    resolt: 'Resolved',
    cancelat: 'Cancelled',
  },
};

export default function MaintenanceParts() {
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca'); // idiom
  const [tasks, setTasks] = useState<MaintenanceTask[]>(MOCK_MAINTENANCE_TASKS);
  const [filterStatus, setFilterStatus] = useState<MaintenanceStatus | 'all'>('all');
  const [filterRoom, setFilterRoom] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    room_id: '',
    type: '',
    description: '',
    priority: 3,
  });

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => 
      (filterStatus === 'all' || t.status === filterStatus) &&
      (filterRoom === 'all' || t.room_id === filterRoom)
    );
  }, [tasks, filterStatus, filterRoom]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const newTask: MaintenanceTask = {
      id: `mt${tasks.length + 1}`,
      property_id: 'p1',
      room_id: formData.room_id,
      type: formData.type,
      description: formData.description,
      priority: formData.priority,
      status: 'pendent',
      created_by_id: 'u1',
      reported_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTasks([...tasks, newTask]);
    setFormData({ room_id: '', type: '', description: '', priority: 3 });
  };

  const t = (key: string) => {
    const labels = STATUS_LABELS[lang] || STATUS_LABELS['ca'];
    return labels[key as MaintenanceStatus] || key;
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header & Summary Cards */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">{lang === 'ca' ? 'Manteniment SSTT' : lang === 'es' ? 'Mantenimiento SSTT' : 'SSTT Maintenance'}</h1>
        <div className="flex gap-2">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className={`px-3 py-1 rounded-full text-white text-xs font-medium ${color} flex items-center gap-2`}>
              <span className="w-2 h-2 rounded-full bg-white opacity-50"></span>
              {t(status)}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Side */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 text-[#16213e]">{lang === 'ca' ? 'Nou Part' : lang === 'es' ? 'Nuevo Parte' : 'New Report'}</h2>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">{lang === 'ca' ? 'Habitació' : lang === 'es' ? 'Habitación' : 'Room'}</label>
              <select 
                value={formData.room_id} 
                onChange={e => setFormData({...formData, room_id: e.target.value})}
                className="w-full p-2 border rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-[#e2b04a]"
                required
              >
                <option value="">{lang === 'ca' ? 'Selecciona...' : lang === 'es' ? 'Selecciona...' : 'Select...'}</option>
                {MOCK_ROOMS.map(r => <option key={r.id} value={r.id}>{r.number}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">{lang === 'ca' ? 'Tipus Avaria' : lang === 'es' ? 'Tipo Avería' : 'Failure Type'}</label>
              <input 
                type="text" 
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value})}
                className="w-full p-2 border rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-[#e2b04a]"
                placeholder={lang === 'ca' ? 'ex: Aire condicionat' : lang === 'es' ? 'ej: Aire acondicionado' : 'e.g. Air conditioning'}"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">{lang === 'ca' ? 'Descripció' : lang === 'es' ? 'Descripción' : 'Description'}</label>
              <textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full p-2 border rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-[#e2b04a]"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">{lang === 'ca' ? 'Prioritat (1-5)' : lang === 'es' ? 'Prioridad (1-5)' : 'Priority (1-5)'}</label>
              <input 
                type="number" 
                min="1" 
                max="5" 
                value={formData.priority} 
                onChange={e => setFormData({...formData, priority: parseInt(e.target.value)})}
                className="w-full p-2 border rounded-md bg-white text-slate-800 focus:ring-2 focus:ring-[#e2b04a]"
                required
              />
            </div>
            <button 
              type="submit" 
              className="w-full py-2 px-4 bg-[#1a1a2e] text-[#e2b04a] font-bold rounded-md hover:bg-[#16213e] transition-colors"
            >
              {lang === 'ca' ? 'Crear Part' : lang === 'es' ? 'Crear Parte' : 'Create Report'}
            </button>
          </form>
        </div>

        {/* List Side */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500">{lang === 'ca' ? 'Estat' : lang === 'es' ? 'Estado' : 'Status'}</span>
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value as any)}
                className="p-2 text-sm border rounded-md bg-white text-slate-800"
              >
                <option value="all">{lang === 'ca' ? 'Tots' : lang === 'es' ? 'Todos' : 'All'}</option>
                {Object.keys(STATUS_COLORS).map(s => (
                  <option key={s} value={s}>{t(s as MaintenanceStatus)}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500">{lang === 'ca' ? 'Habitació' : lang === 'es' ? 'Habitación' : 'Room'}</span>
              <select 
                value={filterRoom} 
                onChange={e => setFilterRoom(e.target.value)}
                className="p-2 text-sm border rounded-md bg-white text-slate-800"
              >
                <option value="all">{lang === 'ca' ? 'Tots' : lang === 'es' ? 'Todos' : 'All'}</option>
                {MOCK_ROOMS.map(r => <option key={r.id} value={r.id}>{r.number}</option>)}
              </select>
            </div>
          </div>

          {/* Tasks Table */}
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">{lang === 'ca' ? 'Hab' : lang === 'es' ? 'Hab' : 'Rm'}</th>
                  <th className="px-4 py-3">{lang === 'ca' ? 'Tipus' : lang === 'es' ? 'Tipo' : 'Type'}</th>
                  <th className="px-4 py-3">{lang === 'ca' ? 'Descripció' : lang === 'es' ? 'Descripción' : 'Description'}</th>
                  <th className="px-4 py-3 text-center">{lang === 'ca' ? 'Prioritat' : lang === 'es' ? 'Prioridad' : 'Priority'}</th>
                  <th className="px-4 py-3 text-center">{lang === 'ca' ? 'Estat' : lang === 'es' ? 'Estado' : 'Status'}</th>
                  <th className="px-4 py-3 text-right">{lang === 'ca' ? 'Data' : lang === 'es' ? 'Fecha' : 'Date'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length > 0 ? (
                  filteredTasks.map(task => (
                    <tr key={task.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-700">{MOCK_ROOMS.find(r => r.id === task.room_id)?.number}</td>
                      <td className="px-4 py-3 text-slate-600 text-sm">{task.type}</td>
                      <td className="px-4 py-3 text-slate-600 text-sm">{task.description}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${task.priority <= 2 ? 'text-red-600' : 'text-slate-500'}`}>
                        {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-white text-[10px] font-bold uppercase ${STATUS_COLORS[task.status]}`}>
                          {t(task.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 text-xs">
                        {new Date(task.reported_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400 italic">
                      {lang === 'ca' ? 'No s\'ha trobat cap part de manteniment' : lang === 'es' ? 'No se han encontrado partes de mantenimiento' : 'No maintenance reports found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
