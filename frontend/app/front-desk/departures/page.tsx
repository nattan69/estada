import React from 'react';
import { Table } from '@/components/ui/table';
import { ReservationStatusBadge } from '@/components/reservations/ReservationStatusBadge';
import { api } from '@/lib/api';

export default async function DeparturesPage() {
  const departures = await api.reports.departures({});

  const columns = [
    { header: 'Room', accessor: (res: any) => res.room_number || 'TBD' },
    { header: 'Guest', accessor: (res: any) => res.guest_name },
    { header: 'Departure', accessor: 'check_out' },
    { header: 'Status', accessor: (res: any) => <ReservationStatusBadge status={res.status} /> },
    { header: 'Actions', accessor: (res: any) => (
      <button className="text-gold-500 text-xs font-bold hover:underline">Check-out</button>
    )},
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Departures Today</h1>
      <Table data={departures || []} columns={columns} />
    </div>
  );
}
