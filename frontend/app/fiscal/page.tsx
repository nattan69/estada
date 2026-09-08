'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { FiscalRecord, ChainVerifyResponse } from '@/lib/types';
import { translations } from '@/lib/i18n';

export default function FiscalPage() {
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca');
  const [records, setRecords] = useState<FiscalRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<FiscalRecord | null>(null);
  const [chainStatus, setChainStatus] = useState<ChainVerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    propertyId: '',
    from: '',
    to: '',
  });

  const t = translations[lang] || translations['ca'];

  // Specific translations for this page as i18n.ts is minimal
  const localT = {
    ca: {
      title: 'VeriFactu - Compliance Fiscal',
      filterProperty: 'Propietat',
      filterFrom: 'Des de',
      filterTo: 'Fins a',
      btnFilter: 'Filtrar',
      btnVerify: 'Verificar Cadena de Hash',
      tableInvoice: 'Factura',
      tableDate: 'Data',
      tableTotal: 'Total',
      tableTax: 'IVA',
      detailTitle: 'Detall de la Factura',
      detailBase: 'Base Imponible',
      detailTax: 'IVA Total',
      detailTotal: 'Total Factura',
      detailBreakdown: 'Desglossament IVA',
      chainValid: 'Cadena Íntegra ✓',
      chainInvalid: 'Cadena Trencada ✗',
      chainBrokenAt: 'Trencada a:',
      chainReason: 'Motiu:',
      chainRecords: 'Registres totals:',
      noRecords: 'No s\'han trobat registres fiscals.',
    },
    es: {
      title: 'VeriFactu - Cumplimiento Fiscal',
      filterProperty: 'Propiedad',
      filterFrom: 'Desde',
      filterTo: 'Hasta',
      btnFilter: 'Filtrar',
      btnVerify: 'Verificar Cadena de Hash',
      tableInvoice: 'Factura',
      tableDate: 'Fecha',
      tableTotal: 'Total',
      tableTax: 'IVA',
      detailTitle: 'Detalle de la Factura',
      detailBase: 'Base Imponible',
      detailTax: 'IVA Total',
      detailTotal: 'Total Factura',
      detailBreakdown: 'Desglose IVA',
      chainValid: 'Cadena Íntegra ✓',
      chainInvalid: 'Cadena Rota ✗',
      chainBrokenAt: 'Rota en:',
      chainReason: 'Motivo:',
      chainRecords: 'Registros totales:',
      noRecords: 'No se han encontrado registros fiscales.',
    },
    en: {
      title: 'VeriFactu - Fiscal Compliance',
      filterProperty: 'Property',
      filterFrom: 'From',
      filterTo: 'To',
      btnFilter: 'Filter',
      btnVerify: 'Verify Hash Chain',
      tableInvoice: 'Invoice',
      tableDate: 'Date',
      tableTotal: 'Total',
      tableTax: 'VAT',
      detailTitle: 'Invoice Detail',
      detailBase: 'Taxable Base',
      detailTax: 'Total VAT',
      detailTotal: 'Invoice Total',
      detailBreakdown: 'VAT Breakdown',
      chainValid: 'Chain Intact ✓',
      chainInvalid: 'Chain Broken ✗',
      chainBrokenAt: 'Broken at:',
      chainReason: 'Reason:',
      chainRecords: 'Total records:',
      noRecords: 'No fiscal records found.',
    },
  }[lang];

  useEffect(() => {
    loadRecords();
  }, [filters]);

  async function loadRecords() {
    setLoading(true);
    try {
      const data = await api.fiscal.listRecords(filters);
      setRecords(data);
    } catch (e) {
      console.error('Error loading records:', e);
    } finally {
      setLoading(false);
    }
  }

  async function verifyChain() {
    if (!filters.propertyId) {
      alert('Please select a property first');
      return;
    }
    try {
      const res = await api.fiscal.verifyChain(filters.propertyId);
      setChainStatus(res);
    } catch (e) {
      console.error('Error verifying chain:', e);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Lang Switcher */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#1a1a2e]">{localT.title}</h1>
        <div className="flex gap-2">
          {(['ca', 'es', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                lang === l ? 'bg-[#e2b04a] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Filters & Chain Verify */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[#16213e] text-white rounded-xl shadow-lg">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold opacity-80">{localT.filterProperty}</label>
          <input
            type="text"
            value={filters.propertyId}
            onChange={(e) => setFilters({ ...filters, propertyId: e.target.value })}
            className="p-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#e2b04a]"
            placeholder="UUID..."
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold opacity-80">{localT.filterFrom}</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="p-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#e2b04a]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold opacity-80">{localT.filterTo}</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="p-2 rounded bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#e2b04a]"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={loadRecords}
            className="flex-1 p-2 rounded bg-[#e2b04a] text-[#1a1a2e] font-bold hover:bg-yellow-500 transition-colors"
          >
            {localT.btnFilter}
          </button>
          <button
            onClick={verifyChain}
            className="flex-1 p-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
          >
            {localT.btnVerify}
          </button>
        </div>
      </div>

      {/* Chain Status Panel */}
      {chainStatus && (
        <div className={`p-4 rounded-xl border-l-8 shadow-md ${
          chainStatus.valid 
            ? 'bg-green-50 border-green-500 text-green-800' 
            : 'bg-red-50 border-red-500 text-red-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${chainStatus.valid ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-bold text-lg">
              {chainStatus.valid ? localT.chainValid : localT.chainInvalid}
            </span>
          </div>
          {!chainStatus.valid && (
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <p><span className="font-semibold">{localT.chainBrokenAt}</span> {chainStatus.broken_at}</p>
              <p><span className="font-semibold">{localT.chainReason}</span> {chainStatus.reason}</p>
            </div>
          )}
          {chainStatus.valid && (
            <p className="text-sm opacity-90">{localT.chainRecords} {chainStatus.total_records}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-gray-600 text-sm">{localT.tableInvoice}</th>
                <th className="p-4 font-semibold text-gray-600 text-sm">{localT.tableDate}</th>
                <th className="p-4 font-semibold text-gray-600 text-sm text-right">{localT.tableTotal}</th>
                <th className="p-4 font-semibold text-gray-600 text-sm text-right">{localT.tableTax}</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400">{localT.noRecords}</td></tr>
              ) : (
                records.map((rec) => (
                  <tr 
                    key={rec.id} 
                    className={`border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${selectedRecord?.id === rec.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedRecord(rec)}
                  >
                    <td className="p-4 font-medium text-[#1a1a2e]">{rec.invoice_number}</td>
                    <td className="p-4 text-gray-600 text-sm">{new Date(rec.issued_at).toLocaleDateString(lang)}</td>
                    <td className="p-4 text-right font-bold">{rec.total.toFixed(2)}€</td>
                    <td className="p-4 text-right text-gray-500 text-sm">{rec.iva.toFixed(2)}€</td>
                    <td className="p-4 text-right">
                      <button className="text-blue-600 hover:underline text-sm">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {selectedRecord ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-xl font-bold text-[#1a1a2e]">{localT.detailTitle}</h2>
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{localT.detailBase}</span>
                  <span className="font-medium">{selectedRecord.base_imponible.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{localT.detailTax}</span>
                  <span className="font-medium">{selectedRecord.iva.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-3 text-[#1a1a2e]">
                  <span>{localT.detailTotal}</span>
                  <span>{selectedRecord.total.toFixed(2)}€</span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{localT.detailBreakdown}</h3>
                <div className="space-y-2">
                  {selectedRecord.vat_breakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded text-sm">
                      <span>{item.rate}%</span>
                      <div className="flex gap-4">
                        <span className="text-gray-500">Base: {item.base.toFixed(2)}€</span>
                        <span className="font-medium">Tax: {item.tax.toFixed(2)}€</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-[#16213e] rounded-lg text-white text-xs font-mono break-all">
                <p className="text-gray-400 mb-2 uppercase font-bold">Hash</p>
                {selectedRecord.hash}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 text-gray-400 italic">
              <p>Select a record to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
