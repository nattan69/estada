import React from 'react';
import { Table } from '@/components/ui/table';
import { api } from '@/lib/api';

export default async function RatesPage() {
  const rates = await api.rates.list({});

  const columns = [
    { header: 'Room Type', accessor: (r: any) => r.room_type_id },
    { header: 'Plan', accessor: (r: any) => r.rate_plan_id },
    { header: 'Date', accessor: 'date' },
    { header: 'Price', accessor: (r: any) => `€${r.price}` },
    { header: 'Stop Sell', accessor: (r: any) => r.stop_sell ? 'Yes' : 'No' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Rates Management</h1>
        <button className="px-4 py-2 bg-gold-500 text-slate-900 text-sm font-bold rounded hover:bg-gold-400">
          Bulk Update
        </button>
      </div>
      <Table data={rates || []} columns={columns} />
    </div>
  );
}
