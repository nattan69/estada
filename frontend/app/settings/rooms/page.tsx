import React from 'react';
import { Table } from '@/components/ui/table';

export default function RoomsSettingsPage() {
  const mockRooms = [
    { id: 'rm-1', number: '101', type: 'Double', status: 'clean' },
    { id: 'rm-2', number: '102', type: 'Double', status: 'dirty' },
    { id: 'rm-3', number: '201', type: 'Suite', status: 'clean' },
  ];

  const columns: { header: string; accessor: keyof typeof mockRooms[number] | ((r: any) => React.ReactNode) }[] = [
    { header: 'Room #', accessor: 'number' },
    { header: 'Type', accessor: 'type' },
    { header: 'Status', accessor: 'status' },
    { header: 'Actions', accessor: (r: any) => <button className="text-gold-500 text-xs font-bold hover:underline">Edit</button> },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Room Configuration</h1>
      <Table data={mockRooms} columns={columns} />
    </div>
  );
}
