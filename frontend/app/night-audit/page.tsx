'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { NightAudit, NightAuditTask } from '@/lib/types';
import { translations } from '@/lib/i18n';
import { useWorkspace } from '@/components/WorkspaceBar';

function taskDataText(task: NightAuditTask): string {
  const d = task.data;
  if (!d || Object.keys(d).length === 0) return '';
  if (task.task_key === 'extras_invoiced') return `${d.extras_posted} extres (${Number(d.extras_revenue || 0).toLocaleString()} €)`;
  if (task.task_key === 'cash_reconciliation') {
    const methods = Object.entries(d.payments_by_method || {})
      .map(([m, a]) => `${m}: ${Number(a).toLocaleString()} €`)
      .join(' · ');
    return methods ? `${methods} — Total ${Number(d.payments_total || 0).toLocaleString()} €` : `Total ${Number(d.payments_total || 0).toLocaleString()} €`;
  }
  if (task.task_key === 'morning_lists') return `${d.arrivals} arribades · ${d.departures} sortides`;
  if (task.task_key === 'police_report') return `${d.police_registry_count} viatgers`;
  return JSON.stringify(d);
}

export default function NightAuditPage() {
  const { propertyId } = useWorkspace();
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca');
  const [audits, setAudits] = useState<NightAudit[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<NightAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [sendingPolice, setSendingPolice] = useState(false);
  const [policeMsg, setPoliceMsg] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<NightAuditTask[]>([]);

  const t = translations[lang];
  
  // Trilingüe local per a la pàgina (ja que i18n.ts és molt bàsic)
  const pageT = {
    ca: {
      title: 'Night Audit',
      runBtn: 'Executar Night Audit',
      runningBtn: 'Executant...',
      columns: { date: 'Data', status: 'Estat', revenue: 'Ingressos', nights: 'Nits', noShows: 'No-shows' },
      status: { completed: 'Completat', running: 'En curs', failed: 'Fallit' },
      detailTitle: 'Detall del Tancament',
      summary: {
        occupancy: 'Ocupació',
        arrivals: 'Arribades',
        departures: 'Sortides',
        revenue: 'Ingressos Totals',
        foliosClosed: 'Folios Tancats',
        foliosOpen: 'Folios Oberts',
        nights: 'Nits Postades',
        no_shows: 'No-shows',
      },
      cashClose: 'Tancament de caixa',
      total: 'Total',
      extras: 'Extres facturats',
      extrasCount: 'Nombre d\'extres',
      extrasRevenue: 'Import dels extres',
      police: {
        title: 'Fixes de policia (viatgers)',
        count: 'Viatgers del dia',
        pending: 'Pendent d\'enviar',
        sent: 'Enviat',
        send: 'Enviar fixes',
        sending: 'Enviant...',
        sentAt: 'Enviat a',
      },
      checklist: {
        title: 'Checklist de tasques',
        pending: 'Pendent',
        done: 'Fet',
        skipped: 'Saltat',
        progress: 'de',
        allDone: 'Totes les tasques fetes',
      },
      error: 'Error en l\'execució'
    },
    es: {
      title: 'Night Audit',
      runBtn: 'Ejecutar Night Audit',
      runningBtn: 'Ejecutando...',
      columns: { date: 'Fecha', status: 'Estado', revenue: 'Ingresos', nights: 'Noches', noShows: 'No-shows' },
      status: { completed: 'Completado', running: 'En curso', failed: 'Fallido' },
      detailTitle: 'Detalle del Cierre',
      summary: {
        occupancy: 'Ocupación',
        arrivals: 'Llegadas',
        departures: 'Salidas',
        revenue: 'Ingresos Totales',
        foliosClosed: 'Folios Cerrados',
        foliosOpen: 'Folios Abiertos',
        nights: 'Noches Posteadas',
        no_shows: 'No-shows',
      },
      cashClose: 'Cierre de caja',
      total: 'Total',
      extras: 'Extras facturados',
      extrasCount: 'Número de extras',
      extrasRevenue: 'Importe de los extras',
      police: {
        title: 'Fichas de policía (viajeros)',
        count: 'Viajeros del día',
        pending: 'Pendiente de enviar',
        sent: 'Enviado',
        send: 'Enviar fichas',
        sending: 'Enviando...',
        sentAt: 'Enviado a las',
      },
      checklist: {
        title: 'Checklist de tareas',
        pending: 'Pendiente',
        done: 'Hecho',
        skipped: 'Saltado',
        progress: 'de',
        allDone: 'Todas las tareas hechas',
      },
      error: 'Error en la ejecución'
    },
    en: {
      title: 'Night Audit',
      runBtn: 'Run Night Audit',
      runningBtn: 'Running...',
      columns: { date: 'Date', status: 'Status', revenue: 'Revenue', nights: 'Nights', noShows: 'No-shows' },
      status: { completed: 'Completed', running: 'Running', failed: 'Failed' },
      detailTitle: 'Closure Detail',
      summary: {
        occupancy: 'Occupancy',
        arrivals: 'Arrivals',
        departures: 'Departures',
        revenue: 'Total Revenue',
        foliosClosed: 'Folios Closed',
        foliosOpen: 'Folios Open',
        nights: 'Nights Posted',
        no_shows: 'No-shows',
      },
      cashClose: 'Cash close',
      total: 'Total',
      extras: 'Extras billed',
      extrasCount: 'Number of extras',
      extrasRevenue: 'Extras amount',
      police: {
        title: 'Police reports (guests)',
        count: 'Guests today',
        pending: 'Pending',
        sent: 'Sent',
        send: 'Send reports',
        sending: 'Sending...',
        sentAt: 'Sent at',
      },
      checklist: {
        title: 'Task checklist',
        pending: 'Pending',
        done: 'Done',
        skipped: 'Skipped',
        progress: 'of',
        allDone: 'All tasks done',
      },
      error: 'Execution error'
    }
  }[lang];

  useEffect(() => {
    loadAudits();
  }, [propertyId]);

  async function loadAudits() {
    if (!propertyId) return;
    try {
      setLoading(true);
      const data = await api.nightAudit.list({ propertyId });
      setAudits(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRun() {
    if (!propertyId) return;
    try {
      setRunning(true);
      await api.nightAudit.run({ property_id: propertyId });
      await loadAudits();
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  }

  async function handleSendPolice(audit: NightAudit) {
    setSendingPolice(true);
    setPoliceMsg(null);
    try {
      const res = await api.nightAudit.sendPoliceReport(audit.id);
      setPoliceMsg(`✓ ${res.count} ${pageT.police.count} · ${pageT.police.sent}`);
      // refresca el detall seleccionat
      const updated = await api.nightAudit.get(audit.id);
      setSelectedAudit(updated);
      await loadAudits();
    } catch (e) {
      console.error(e);
      setPoliceMsg('✗ Error enviant les fixes');
    } finally {
      setSendingPolice(false);
    }
  }

  async function loadChecklist(auditId: string) {
    try {
      const data = await api.nightAudit.getChecklist(auditId);
      setChecklist(data);
    } catch (e) {
      console.error(e);
      setChecklist([]);
    }
  }

  function selectAudit(audit: NightAudit) {
    setSelectedAudit(audit);
    setPoliceMsg(null);
    loadChecklist(audit.id);
  }

  async function toggleTask(task: NightAuditTask) {
    const next: 'pending' | 'done' = task.status === 'done' ? 'pending' : 'done';
    try {
      const updated = await api.nightAudit.updateTask(task.id, next);
      setChecklist((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (e) {
      console.error(e);
    }
  }

  const doneCount = checklist.filter((t) => t.status === 'done').length;

  const getStatusColor = (status: NightAudit['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'running': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1a1a2e]">{pageT.title}</h1>
          <div className="flex gap-2 mt-2">
            {(['ca', 'es', 'en'] as const).map(l => (
              <button 
                key={l} 
                onClick={() => setLang(l)} 
                className={`px-2 py-1 text-xs rounded ${lang === l ? 'bg-[#e2b04a] text-white' : 'bg-gray-200 text-gray-600'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <button 
          onClick={handleRun}
          disabled={running}
          className="bg-[#e2b04a] hover:bg-[#cfa03a] text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 shadow-lg"
        >
          {running ? pageT.runningBtn : pageT.runBtn}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">{pageT.columns.date}</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">{pageT.columns.status}</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">{pageT.columns.revenue}</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">{pageT.columns.nights}</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">{pageT.columns.noShows}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Carregant...</td></tr>
              ) : audits.map(audit => (
                <tr 
                  key={audit.id} 
                  onClick={() => selectAudit(audit)}
                  className={`cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 ${selectedAudit?.id === audit.id ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-3 text-sm">{audit.audit_date}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(audit.status)}`}>
                      {pageT.status[audit.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{audit.summary.total_revenue.toLocaleString()} €</td>
                  <td className="px-4 py-3 text-sm">{audit.summary.nights_posted}</td>
                  <td className="px-4 py-3 text-sm">{audit.summary.no_shows}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-blue-600 hover:underline text-xs">Detalls</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
          {selectedAudit ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-xl font-bold text-[#1a1a2e]">{pageT.detailTitle}</h2>
                <span className="text-sm text-gray-500">{selectedAudit.audit_date}</span>
              </div>

              {/* Checklist de tasques diàries */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-[#1a1a2e]">☑ {pageT.checklist.title}</h3>
                  <span className={`text-xs font-semibold ${doneCount === checklist.length && checklist.length > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                    {doneCount} {pageT.checklist.progress} {checklist.length}
                    {doneCount === checklist.length && checklist.length > 0 ? ' ✓' : ''}
                  </span>
                </div>
                {checklist.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Carregant checklist...</p>
                ) : (
                  <div className="space-y-2">
                    {checklist.map((task) => (
                      <label key={task.id} className="flex items-start gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={task.status === 'done'}
                          onChange={() => toggleTask(task)}
                          className="mt-0.5 accent-[#e2b04a]"
                        />
                        <span className="flex-1">
                          <span className={`block text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-[#1a1a2e]'}`}>
                            {task.title}
                          </span>
                          {task.description && (
                            <span className="block text-xs text-gray-500 mt-0.5">{task.description}</span>
                          )}
                          {taskDataText(task) && (
                            <span className="block text-xs text-amber-700 mt-0.5 font-medium">{taskDataText(task)}</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-semibold">{pageT.summary.occupancy}</p>
                  <p className="text-2xl font-bold text-[#1a1a2e]">{selectedAudit.summary.occupancy_pct}%</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-semibold">{pageT.summary.revenue}</p>
                  <p className="text-2xl font-bold text-[#1a1a2e]">{selectedAudit.summary.total_revenue.toLocaleString()} €</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-semibold">{pageT.summary.arrivals}</p>
                  <p className="text-2xl font-bold text-[#1a1a2e]">{selectedAudit.summary.arrivals}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-semibold">{pageT.summary.departures}</p>
                  <p className="text-2xl font-bold text-[#1a1a2e]">{selectedAudit.summary.departures}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-semibold">{pageT.summary.nights}</p>
                  <p className="text-2xl font-bold text-[#1a1a2e]">{selectedAudit.summary.nights_posted}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-semibold">{pageT.summary.no_shows}</p>
                  <p className="text-2xl font-bold text-[#1a1a2e]">{selectedAudit.summary.no_shows}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-semibold">{pageT.summary.foliosClosed}</p>
                  <p className="text-2xl font-bold text-[#1a1a2e]">{selectedAudit.summary.folios_closed}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-semibold">{pageT.summary.foliosOpen}</p>
                  <p className="text-2xl font-bold text-[#1a1a2e]">{selectedAudit.summary.folios_open}</p>
                </div>
              </div>

              {selectedAudit.error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 text-sm">
                  <strong>Error:</strong> {selectedAudit.error}
                </div>
              )}

              {/* Tancament de caixa: desglossament per mètode de pagament */}
              {selectedAudit.summary.payments_by_method && Object.keys(selectedAudit.summary.payments_by_method).length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-[#1a1a2e] mb-3">{pageT.cashClose}</h3>
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(selectedAudit.summary.payments_by_method).map(([method, amount]) => (
                        <tr key={method} className="border-b border-gray-100">
                          <td className="py-2 text-gray-600 capitalize">{method}</td>
                          <td className="py-2 text-right font-medium">{Number(amount).toLocaleString()} €</td>
                        </tr>
                      ))}
                      {selectedAudit.summary.payments_total && (
                        <tr className="font-bold">
                          <td className="py-2 text-[#1a1a2e]">{pageT.total}</td>
                          <td className="py-2 text-right">{Number(selectedAudit.summary.payments_total).toLocaleString()} €</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Extres facturats a les sortides */}
              {selectedAudit.summary.extras_posted !== undefined && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-[#1a1a2e] mb-2">{pageT.extras}</h3>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{pageT.extrasCount}</span>
                    <span className="font-medium">{selectedAudit.summary.extras_posted}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">{pageT.extrasRevenue}</span>
                    <span className="font-medium">{Number(selectedAudit.summary.extras_revenue || 0).toLocaleString()} €</span>
                  </div>
                </div>
              )}

              {/* Fixes de policia (viatgers) — tasca diària del checklist */}
              {selectedAudit.summary.police_registry_count !== undefined && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-[#1a1a2e] mb-2">{pageT.police.title}</h3>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{pageT.police.count}</span>
                    <span className="font-medium">{selectedAudit.summary.police_registry_count}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className={`text-xs font-medium ${selectedAudit.summary.police_report_sent ? 'text-green-600' : 'text-amber-600'}`}>
                      {selectedAudit.summary.police_report_sent ? pageT.police.sent : pageT.police.pending}
                    </span>
                    <button
                      onClick={() => handleSendPolice(selectedAudit)}
                      disabled={sendingPolice || selectedAudit.summary.police_report_sent}
                      className="px-3 py-1.5 bg-[#1a1a2e] text-white rounded text-xs font-medium hover:bg-[#16213e] disabled:opacity-50 transition-colors"
                    >
                      {sendingPolice ? pageT.police.sending : pageT.police.send}
                    </button>
                  </div>
                  {selectedAudit.summary.police_report_sent_at && (
                    <p className="text-xs text-gray-400 mt-1">{pageT.police.sentAt} {selectedAudit.summary.police_report_sent_at}</p>
                  )}
                  {policeMsg && <p className="text-xs mt-1 text-green-600">{policeMsg}</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 opacity-60">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-2xl">📊</div>
              <p className="text-gray-500 text-sm">Seleccioneu un tancament per veure el detall</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
