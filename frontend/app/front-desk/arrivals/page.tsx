import React from 'react';
import { Table } from '@/components/ui/table';
import { ReservationStatusBadge } from '@/components/reservations/ReservationStatusBadge';
import { api } from '@/lib/api';

export default async function ArrivalsPage() {
  // In Next.js 15 App Router, we can fetch directly if it's a server component
  // Since api.ts uses fetch, it works here.
  const arrivals = await api.reports.arrivals({});

  const columns = [
    { header: 'Room', accessor: (res: any) => res.room_number || 'TBD' },
    { header: 'Guest', accessor: (res: any) => res.guest_name },
    { header: 'Arrival', accessor: 'check_in' },
    { header: 'Status', accessor: (res: any) => <ReservationStatusBadge status={res.status} /> },
    { header: 'Actions', accessor: (res: any) => (
      <button className="text-gold-500 text-xs font-bold hover:underline">Check-in</button>
    )},
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Arrivals Today</h1>
      <Table data={arrivals || []} columns={columns} />
    </div>
  );
}
