import React from 'react';
import { Reservation } from '@/lib/types';

export const ReservationTimeline = ({ reservation }: { reservation: Reservation }) => {
  return (
    <div className="flex items-center gap-4 p-3 bg-slate-800 rounded-lg border border-slate-700 text-white">
      <div className="flex flex-col text-xs">
        <span className="text-slate-400 uppercase font-bold">Check-in</span>
        <span className="font-mono">{reservation.check_in}</span>
      </div>
      <div className="flex-1 h-1 bg-slate-600 relative">
        <div className="absolute inset-0 bg-gold-500 w-1/2" />
      </div>
      <div className="flex flex-col text-xs text-right">
        <span className="text-slate-400 uppercase font-bold">Check-out</span>
        <span className="font-mono">{reservation.check_out}</span>
      </div>
    </div>
  );
};
