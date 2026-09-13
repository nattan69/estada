'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { api } from '@/lib/api';
import CalendarDropdown from '@/components/CalendarDropdown';

/**
 * Context global de propietat + data (decisió Tomeu 13/09).
 * Selector tipus Google al header; les pàgines consumeixen useWorkspace().
 * Persistència: localStorage (propietat) — la data a sessionStorage.
 *
 * WorkspaceProvider embolcalla TOTA l'app (al layout), perquè qualsevol
 * pàgina (children) pugui llegir useWorkspace(). WorkspaceBar és només la
 * barra visual (selectors) que llegeix el mateix context.
 *
 * La data és UNA sola data (no rang): el "des de → fins" no tenia sentit,
 * i s'ha substituït per un calendari desplegable (model del dashboard de
 * Jornals).
 */

type Property = { id: string; name?: string; nom?: string };

const WorkspaceContext = createContext<{
  propertyId: string | null;
  setPropertyId: (id: string) => void;
  properties: Property[];
  date: string;
  setDate: (d: string) => void;
}>({
  propertyId: null,
  setPropertyId: () => {},
  properties: [],
  date: '',
  setDate: () => {},
});

export const useWorkspace = () => useContext(WorkspaceContext);

function pad(n: number) { return n.toString().padStart(2, '0'); }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyIdState] = useState<string | null>(null);
  const [date, setDateState] = useState<string>(todayStr());

  useEffect(() => {
    (async () => {
      try {
        const props = await api.properties.list();
        setProperties(props || []);
        const saved = localStorage.getItem('estada-property-id');
        const valid = props?.some((p: Property) => p.id === saved);
        setPropertyIdState(valid ? saved : props?.[0]?.id ?? null);
      } catch { /* sense sessió — no pinta res */ }
    })();
    const s = sessionStorage.getItem('estada-date');
    if (s) setDateState(s);
  }, []);

  const setPropertyId = (id: string) => {
    setPropertyIdState(id);
    localStorage.setItem('estada-property-id', id);
  };

  const setDate = (d: string) => {
    setDateState(d);
    sessionStorage.setItem('estada-date', d);
  };

  return (
    <WorkspaceContext.Provider value={{ propertyId, setPropertyId, properties, date, setDate }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export default function WorkspaceBar() {
  const { properties, propertyId, setPropertyId, date, setDate } = useWorkspace();

  const nom = (p: Property) => p.name || p.nom || `Propietat ${p.id}`;

  return (
    <div className="workspace-bar" style={{
      display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
      padding: '10px 16px', borderRadius: '10px', marginBottom: '16px',
      background: 'var(--card, #fff)', border: '1px solid var(--border, #e5e7eb)',
    }}>
      <select
        aria-label="Propietat"
        value={propertyId ?? ''}
        onChange={(e) => setPropertyId(e.target.value)}
        style={{ padding: '8px 12px', borderRadius: '10px', fontWeight: 600 }}
      >
        {properties.map((p) => <option key={p.id} value={p.id}>🏨 {nom(p)}</option>)}
      </select>
      <CalendarDropdown value={date} onChange={setDate} />
    </div>
  );
}
