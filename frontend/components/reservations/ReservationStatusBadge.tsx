import React from 'react';
import { ReservationStatus } from '@/lib/types';

export const ReservationStatusBadge = ({ status }: { status: ReservationStatus }) => {
  const styles: Record<ReservationStatus, string> = {
    quote: 'bg-slate-500 text-white',
    confirmed: 'bg-blue-500 text-white',
    checked_in: 'bg-green-500 text-white',
    checked_out: 'bg-slate-700 text-slate-300',
    canceled: 'bg-red-500 text-white',
    no_show: 'bg-orange-600 text-white',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};
