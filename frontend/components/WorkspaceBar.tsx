'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { api } from '@/lib/api';

/**
 * Context global de propietat + rang de dates (decisió Tomeu 13/09).
 * Selector tipus Google al header; les pàgines consumeixen useWorkspace().
 * Persistència: localStorage (propietat) — les dates a sessionStorage.
 */

type Property = { id: number; name?: string; nom?: string };
type Dates = { from: string; to: string };

const WorkspaceContext = createContext<{
  propertyId: number | null;
  setPropertyId: (id: number) => void;
  properties: Property[];
  dates: Dates;
  setDates: (d: Dates) => void;
}>({
  propertyId: null,
  setPropertyId: () => {},
  properties: [],
  dates: { from: '', to: '' },
  setDates: () => {},
});

export const useWorkspace = () => useContext(WorkspaceContext);

export default function WorkspaceBar() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyIdState] = useState<number | null>(null);
  const [dates, setDatesState] = useState<Dates>({ from: '', to: '' });

  useEffect(() => {
    (async () => {
      try {
        const props = await api.properties.list();
        setProperties(props || []);
        const saved = localStorage.getItem('estada-property-id');
        const valid = props?.some((p: Property) => String(p.id) === saved);
        setPropertyIdState(valid ? Number(saved) : props?.[0]?.id ?? null);
      } catch { /* sense sessió — no pinta res */ }
    })();
    const s = sessionStorage.getItem('estada-dates');
    if (s) try { setDatesState(JSON.parse(s)); } catch {}
  }, []);

  const setPropertyId = (id: number) => {
    setPropertyIdState(id);
    localStorage.setItem('estada-property-id', String(id));
  };

  const setDates = (d: Dates) => {
    setDatesState(d);
    sessionStorage.setItem('estada-dates', JSON.stringify(d));
  };

  const nom = (p: Property) => p.name || p.nom || `Propietat ${p.id}`;
  const avui = new Date().toISOString().split('T')[0];
  const fa7 = new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0];

  return (
    <WorkspaceContext.Provider value={{ propertyId, setPropertyId, properties, dates, setDates }}>
      <div className="workspace-bar" style={{
        display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
        padding: '10px 16px', borderRadius: '10px', marginBottom: '16px',
        background: 'var(--card, #fff)', border: '1px solid var(--border, #e5e7eb)',
      }}>
        <select
          aria-label="Propietat"
          value={propertyId ?? ''}
          onChange={(e) => setPropertyId(Number(e.target.value))}
          style={{ padding: '6px 10px', borderRadius: '8px', fontWeight: 600 }}
        >
          {properties.map((p) => <option key={p.id} value={p.id}>🏨 {nom(p)}</option>)}
        </select>
        <input type="date" aria-label="Des de" value={dates.from}
          onChange={(e) => setDates({ ...dates, from: e.target.value })}
          style={{ padding: '5px 8px', borderRadius: '8px' }} />
        <span style={{ opacity: 0.5 }}>→</span>
        <input type="date" aria-label="Fins a" value={dates.to}
          onChange={(e) => setDates({ ...dates, to: e.target.value })}
          style={{ padding: '5px 8px', borderRadius: '8px' }} />
        {!dates.from && (
          <button onClick={() => setDates({ from: fa7, to: avui })}
            style={{ padding: '5px 10px', borderRadius: '8px', cursor: 'pointer' }}>
            Últims 7 dies
          </button>
        )}
      </div>
    </WorkspaceContext.Provider>
  );
}