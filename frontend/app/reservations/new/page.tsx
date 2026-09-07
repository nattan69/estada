import React from 'react';
import { ReservationForm } from '@/components/reservations/ReservationForm';

export default function NewReservationPage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white">New Reservation</h1>
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <ReservationForm />
      </div>
    </div>
  );
}
