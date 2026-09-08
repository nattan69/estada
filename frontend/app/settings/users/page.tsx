import React from 'react';
import { Table } from '@/components/ui/table';

export default function UsersSettingsPage() {
  const mockUsers = [
    { id: 'u-1', name: 'Admin User', email: 'admin@hotel.com', role: 'admin' },
    { id: 'u-2', name: 'Receptionist 1', email: 'rec1@hotel.com', role: 'reception' },
  ];

  const columns: { header: string; accessor: keyof typeof mockUsers[number] | ((u: any) => React.ReactNode) }[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Role', accessor: 'role' },
    { header: 'Actions', accessor: (u: any) => <button className="text-gold-500 text-xs font-bold hover:underline">Edit</button> },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">User Management</h1>
      <Table data={mockUsers} columns={columns} />
    </div>
  );
}
