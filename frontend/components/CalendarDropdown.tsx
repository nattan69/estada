'use client';

import { useState, useMemo } from 'react';

/**
 * Calendari desplegable d'una sola data (model copiat del header del dashboard
 * de Jornals). Mostra la data seleccionada formatejada (dia de la setmana + dia
 * + mes + any) i desplega un calendari navegable amb graella de dies.
 */

const MONTHS = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
const WEEKDAYS = ['dl', 'dt', 'dc', 'dj', 'dv', 'ds', 'dg'];

function pad(n: number) { return n.toString().padStart(2, '0'); }
function fmt(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

export default function CalendarDropdown({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const selected = useMemo(() => {
    const d = value ? new Date(value + 'T00:00:00') : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => y - 5 + i);
  }, []);

  const cells = useMemo(() => {
    // setmana comença diumenge (getDay(): 0=diumenge)
    const first = new Date(viewYear, viewMonth, 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    const out: { date: string; day: number; currentMonth: boolean }[] = [];
    const cur = new Date(start);
    for (let i = 0; i < 42; i++) {
      out.push({
        date: fmt(cur),
        day: cur.getDate(),
        currentMonth: cur.getMonth() === viewMonth,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [viewYear, viewMonth]);

  const today = fmt(new Date());
  const selStr = fmt(selected);

  const formatted = selected.toLocaleDateString('ca-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const nav = (deltaMonth: number, deltaYear = 0) => {
    const d = new Date(viewYear, viewMonth + deltaMonth, 1);
    d.setFullYear(d.getFullYear() + deltaYear);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const pick = (date: string) => {
    onChange(date);
    setOpen(false);
  };

  const goToday = () => {
    const d = new Date();
    onChange(fmt(d));
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '9px 14px', borderRadius: '10px', cursor: 'pointer',
          fontWeight: 600, fontSize: '0.9rem',
          background: 'var(--accent, #16213e)', color: 'var(--accent-fg, #fff)',
          border: '1px solid var(--border, #e5e7eb)',
        }}
      >
        <span aria-hidden>📅</span>
        <span style={{ textTransform: 'capitalize' }}>{formatted}</span>
        <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 1000,
            minWidth: 300, background: 'var(--card, #fff)',
            border: '1px solid var(--border, #e5e7eb)', borderRadius: 14,
            boxShadow: '0 12px 30px rgba(0,0,0,0.18)', overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid var(--border, #e5e7eb)' }}>
            <button type="button" onClick={() => nav(-1)} title="Mes anterior" style={navBtn}>‹</button>
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                style={selectStyle}
              >
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                style={selectStyle}
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => nav(1)} title="Mes següent" style={navBtn}>›</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 12px', gap: 1 }}>
            {WEEKDAYS.map((w) => (
              <div key={w} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted, #94a3b8)', padding: '6px 0' }}>{w}</div>
            ))}
            {cells.map((c) => {
              const isSel = c.date === selStr && c.currentMonth;
              const isToday = c.date === today;
              const isOther = !c.currentMonth;
              return (
                <button
                  key={c.date}
                  type="button"
                  onClick={() => c.currentMonth && pick(c.date)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: 36, borderRadius: 8, cursor: c.currentMonth ? 'pointer' : 'default',
                    fontWeight: isSel ? 700 : 500, fontSize: '0.85rem',
                    background: isSel ? 'var(--accent, #16213e)' : isToday ? 'var(--accent-soft, #e2b04a33)' : 'transparent',
                    color: isSel ? 'var(--accent-fg, #fff)' : isOther ? 'var(--muted, #cbd5e1)' : 'var(--text, #1f2937)',
                    border: 'none',
                  }}
                >
                  {c.day}
                </button>
              );
            })}
          </div>

          <div style={{ padding: 10, borderTop: '1px solid var(--border, #e5e7eb)', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={goToday}
              style={{ padding: '6px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: 'var(--accent, #16213e)', color: 'var(--accent-fg, #fff)', border: 'none' }}
            >
              Avui
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem',
  padding: '2px 8px', borderRadius: 8, color: 'var(--muted, #64748b)',
};

const selectStyle: React.CSSProperties = {
  padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border, #e5e7eb)',
  fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
  background: 'var(--input, #f1f5f9)', color: 'var(--text, #1f2937)',
};
