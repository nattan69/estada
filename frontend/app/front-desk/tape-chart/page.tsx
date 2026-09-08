'use client';

import React, { useState, useEffect } from 'react';
import { TapeChart } from '@/components/tape-chart/TapeChart';
import { translations } from '@/lib/i18n';
import { api } from '@/lib/api';
import type { Reservation, Room } from '@/lib/types';

export default function TapeChartPage() {
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const propertyId = 'prop-1';
        const [roomsData, resData] = await Promise.all([
          api.rooms.list({ propertyId }),
          api.reservations.list({ propertyId })
        ]);
        setRooms(roomsData);
        setReservations(resData);
      } catch (e) {
        console.error('Error carregant dades del Tape Chart:', e);
        setError('Error connecting to backend. Using mock data.');
        setRooms([
          { id: 'rm-1', property_id: 'p1', room_type_id: 'rt1', number: '101', status: 'clean', active: true },
          { id: 'rm-2', property_id: 'p1', room_type_id: 'rt1', number: '102', status: 'dirty', active: true },
          { id: 'rm-3', property_id: 'p1', room_type_id: 'rt1', number: '201', status: 'clean', active: true },
        ]);
        setReservations([
          {
            id: 'res-1', property_id: 'p1', guest_id: 'g1', room_type_id: 'rt1',
            assigned_room_id: 'rm-1', confirmation_code: 'RES-001', status: 'confirmed',
            source: 'direct_web', check_in: '2026-09-10', check_out: '2026-09-15',
            adults: 2, children: 0, total_amount: 500, currency: 'EUR',
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const t = translations[lang];

  return (
    <div className="p-6 h-screen flex flex-col bg-[#1a1a2e] text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Tape Chart</h1>
        <div className="flex gap-4">
          <div className="flex gap-2">
            {(['ca', 'es', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 text-xs font-bold rounded transition ${
                  lang === l ? 'bg-[#e2b04a] text-[#1a1a2e]' : 'bg-[#16213e] text-white hover:bg-[#1f2d52]'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-[#16213e] text-white text-sm rounded border border-[#e2b04a]/30 hover:bg-[#1f2d52]">Today</button>
            <button className="px-3 py-1 bg-[#16213e] text-white text-sm rounded border border-[#e2b04a]/30 hover:bg-[#1f2d52]">Next Week</button>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#e2b04a] mx-auto mb-4"></div>
            <p className="text-gray-400">{lang === 'ca' ? 'Carregant dades...' : lang === 'es' ? 'Cargando datos...' : 'Loading data...'}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-[#16213e] rounded-lg border border-[#e2b04a]/20">
          {error && (
            <div className="bg-red-500/20 text-red-400 p-2 text-xs text-center border-b border-red-500/30">
              {error}
            </div>
          )}
          <TapeChart reservations={reservations} rooms={rooms} />
        </div>
      )}
    </div>
  );
}