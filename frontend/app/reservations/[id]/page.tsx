import React from 'react';
import { api } from '@/lib/api';
import { ReservationTimeline } from '@/components/reservations/ReservationTimeline';
import { ReservationStatusBadge } from '@/components/reservations/ReservationStatusBadge';

export default async function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await api.reservations.get(id);

  if (!res) return <div className="p-6 text-white">Reservation not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Reservation {res.confirmation_code}</h1>
          <ReservationStatusBadge status={res.status} />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-slate-800 text-white text-sm rounded border border-slate-700 hover:bg-slate-700">Edit</button>
          <button className="px-4 py-2 bg-gold-500 text-slate-900 text-sm font-bold rounded hover:bg-gold-400">Check-in</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-700 rounded-lg space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-slate-700 pb-2">Guest Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-400">Guest ID:</span> <span className="text-white ml-2">{res.guest_id}</span></div>
              <div><span className="text-slate-400">Adults:</span> <span className="text-white ml-2">{res.adults}</span></div>
              <div><span className="text-slate-400">Children:</span> <span className="text-white ml-2">{res.children}</span></div>
              <div><span className="text-slate-400">Source:</span> <span className="text-white ml-2 capitalize">{res.source}</span></div>
            </div>
          </div>
          <div className="p-6 bg-slate-900 border border-slate-700 rounded-lg space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-slate-700 pb-2">Stay Info</h2>
            <ReservationTimeline reservation={res} />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-400">Room Type ID:</span> <span className="text-white ml-2">{res.room_type_id}</span></div>
              <div><span className="text-slate-400">Total Amount:</span> <span className="text-white ml-2">€{res.total_amount}</span></div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-700 rounded-lg space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-slate-700 pb-2">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              <button className="w-full py-2 bg-slate-800 text-white text-sm rounded border border-slate-700 hover:bg-slate-700 text-left px-3">Assign Room</button>
              <button className="w-full py-2 bg-slate-800 text-white text-sm rounded border border-slate-700 hover:bg-slate-700 text-left px-3">Add Charge</button>
              <button className="w-full py-2 bg-slate-800 text-white text-sm rounded border border-slate-700 hover:bg-slate-700 text-left px-3">Send Confirmation</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
