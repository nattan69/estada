import React from 'react';
import Link from 'next/link';
import { Reservation, ReservationStatus } from '@/lib/types';

interface ReservationBlockProps {
  reservation: Reservation;
  leftOffset: number;
  width: number;
}

export function ReservationBlock({ reservation, leftOffset, width }: ReservationBlockProps) {
  // Mapeig de colors segons status
  const statusColors: Record<ReservationStatus, string> = {
    confirmed: 'bg-[#1a1a2e] text-white', // Blau fosc
    checked_in: 'bg-green-600 text-white', // Verd
    checked_out: 'bg-gray-400 text-white',   // Gris
    canceled: 'bg-red-500 text-white bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.2)_10px,rgba(255,255,255,0.2)_20px)]', // Vermell ratllat
    no_show: 'bg-orange-500 text-white',    // Taronja
    quote: 'bg-blue-200 text-blue-800',
  };

  return (
    <Link 
      href={`/reservations/${reservation.id}`}
      className={`absolute top-1 bottom-1 rounded px-1 text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer overflow-hidden whitespace-nowrap text-ellipsis ${statusColors[reservation.status]}`}
      style={{ 
        left: `${leftOffset}%`, 
        width: `${width}%` 
      }}
      title={`${reservation.confirmation_code} - ${reservation.status}`}
    >
      {reservation.confirmation_code}
    </Link>
  );
}
