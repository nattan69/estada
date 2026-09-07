import React from 'react';
import { Room, Reservation } from '@/lib/types';
import { ReservationBlock } from './ReservationBlock';

interface RoomRowProps {
  room: Room;
  reservations: Reservation[];
  startDate: Date; // Primera data del TapeChart (dia 1)
  cellWidthPercent: number; // Amplega d'una cel·la en % (ex: 100/31)
}

export function RoomRow({ room, reservations, startDate, cellWidthPercent }: RoomRowProps) {
  // Filtrem les reserves assignades a aquesta habitació
  const roomReservations = reservations.filter(res => res.assigned_room_id === room.id);

  return (
    <div className="grid grid-cols-[150px_1fr] border-b hover:bg-gray-50 transition-colors">
      <div className="p-2 border-r bg-gray-50 font-medium flex items-center justify-between">
        <span>{room.number}</span>
        <span className="text-[10px] text-gray-400 uppercase">{room.id.slice(0, 4)}</span>
      </div>
      <div className="relative h-12">
        {roomReservations.map(res => {
          const checkIn = new Date(res.check_in);
          const checkOut = new Date(res.check_out);
          
          // Calcul d'ofset i amplega basat en la data d'inici del TapeChart
          const diffInMs = checkIn.getTime() - startDate.getTime();
          const startDay = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
          
          const stayDurationMs = checkOut.getTime() - checkIn.getTime();
          const nights = Math.ceil(stayDurationMs / (1000 * 60 * 60 * 24));
          
          // Si la reserva està fora del rang visible, no la dibuixem (o la troquem)
          if (startDay < -1 || startDay > 31) return null;

          return (
            <ReservationBlock 
              key={res.id} 
              reservation={res} 
              leftOffset={startDay * cellWidthPercent} 
              width={nights * cellWidthPercent} 
            />
          );
        })}
      </div>
    </div>
  );
}
