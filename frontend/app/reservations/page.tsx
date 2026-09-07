import React from 'react';
import { Table } from '@/components/ui/table';
import { ReservationStatusBadge } from '@/components/reservations/ReservationStatusBadge';
import { api } from '@/lib/api';

export default async function ReservationsPage() {
  const reservations = await api.reservations.list({});

  const columns = [
    { header: 'Code', accessor: 'confirmation_code' },
    { header: 'Guest', accessor: (res: any) => res.guest_id },
    { header: 'Status', accessor: (res: any) => <ReservationStatusBadge status={res.status} /> },
    { header: 'Check-in', accessor: 'check_in' },
    { header: 'Check-out', accessor: 'check_out' },
    { header: 'Amount', accessor: (res: any) => `€${res.total_amount}` },
    { header: 'Actions', accessor: (res: any) => (
      <a href={`/reservations/${res.id}`} className="text-gold-500 text-xs font-bold hover:underline">Details</a>
    )},
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Reservations</h1>
        <a href="/reservations/new" className="px-4 py-2 bg-gold-500 text-slate-900 text-sm font-bold rounded hover:bg-gold-400">
          + New Reservation
        </a>
      </div>
      <Table data={reservations || []} columns={columns} />
    </div>
  );
}
