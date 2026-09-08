import React from 'react';
import { TapeChart } from '@/components/tape-chart/TapeChart';
import { translations } from '@/lib/i18n';
import type { Reservation, Room } from '@/lib/types';

export default function TapeChartPage() {
  const t = translations.ca;

  // Dades mock per a la demo (el backend encara no està connectat aquí)
  const mockRooms: Room[] = [
    { id: 'rm-1', property_id: 'p1', room_type_id: 'rt1', number: '101', status: 'clean', active: true },
    { id: 'rm-2', property_id: 'p1', room_type_id: 'rt1', number: '102', status: 'dirty', active: true },
    { id: 'rm-3', property_id: 'p1', room_type_id: 'rt1', number: '201', status: 'clean', active: true },
  ];
  const mockReservations: Reservation[] = [
    {
      id: 'res-1', property_id: 'p1', guest_id: 'g1', room_type_id: 'rt1',
      assigned_room_id: 'rm-1', confirmation_code: 'RES-001', status: 'confirmed',
      source: 'direct_web', check_in: '2026-09-10', check_out: '2026-09-15',
      adults: 2, children: 0, total_amount: 500, currency: 'EUR',
    },
  ];

  return (
    <div className="p-6 h-screen flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Tape Chart</h1>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-slate-800 text-white text-sm rounded border border-slate-700">Today</button>
          <button className="px-3 py-1 bg-slate-800 text-white text-sm rounded border border-slate-700">Next Week</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-slate-900 rounded-lg border border-slate-700">
        <TapeChart reservations={mockReservations} rooms={mockRooms} />
      </div>
    </div>
  );
}
