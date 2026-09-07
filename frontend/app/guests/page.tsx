import React from 'react';
import { Table } from '@/components/ui/table';

export default function GuestsPage() {
  const mockGuests = [
    { id: 'gst-1', name: 'John Doe', email: 'john@example.com', phone: '+34 600 000 000' },
    { id: 'gst-2', name: 'Jane Smith', email: 'jane@example.com', phone: '+34 600 111 111' },
  ];

  const columns = [
    { header: 'Guest ID', accessor: 'id' },
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Actions', accessor: (g: any) => <button className="text-gold-500 text-xs font-bold hover:underline">Profile</button> },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Guests</h1>
        <button className="px-4 py-2 bg-gold-500 text-slate-900 text-sm font-bold rounded hover:bg-gold-400">
          + Add Guest
        </button>
      </div>
      <Table data={mockGuests} columns={columns} />
    </div>
  );
}
