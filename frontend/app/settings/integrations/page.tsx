import React from 'react';
import { Table } from '@/components/ui/table';

export default function IntegrationsSettingsPage() {
  const mockIntegrations = [
    { id: 'int-1', provider: 'Stripe', type: 'Payments', status: 'Active' },
    { id: 'int-2', provider: 'Booking.com', type: 'Channel Manager', status: 'Connected' },
    { id: 'int-3', provider: 'Ariadna', type: 'AI Receptionist', status: 'Active' },
  ];

  const columns = [
    { header: 'Provider', accessor: 'provider' },
    { header: 'Type', accessor: 'type' },
    { header: 'Status', accessor: 'status' },
    { header: 'Actions', accessor: (i: any) => <button className="text-gold-500 text-xs font-bold hover:underline">Configure</button> },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Integrations</h1>
      <Table data={mockIntegrations} columns={columns} />
    </div>
  );
}
