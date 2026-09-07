import React, { useMemo } from 'react';
import { Reservation, Room } from '@/lib/types';
import { RoomRow } from './RoomRow';

interface TapeChartProps {
  reservations: Reservation[];
  rooms: Room[];
  startDate?: Date; // Si no es passa, es calcula el primer dia del mes actual
}

export function TapeChart({ reservations, rooms, startDate }: TapeChartProps) {
  // Calcul fem de la data d'inici i el rang de dies
  const chartStart = useMemo(() => {
    return startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  }, [startDate]);

  const daysInMonth = 31; // Simplificat a 31 dies per el moment
  const cellWidthPercent = 100 / daysInMonth;

  return (
    <div className="overflow-x-auto p-4 bg-white border rounded-lg shadow-sm">
      <div className="min-w-[1200px]">
        {/* Capçalera de dies */}
        <div className="grid grid-cols-[150px_1fr] border-b bg-gray-100 font-semibold">
          <div className="p-2 border-r bg-gray-100 sticky left-0 z-10">Room</div>
          <div className="grid grid-cols-[repeat(31,1fr)] relative">
            {Array.from({ length: daysInMonth }).map((_, i) => (
              <div key={i} className="p-2 text-center border-r text-xs text-gray-600">
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Fileres d'habitacions */}
        <div className="relative">
          {rooms.map(room => (
            <RoomRow 
              key={room.id} 
              room={room} 
              reservations={reservations} 
              startDate={chartStart}
              cellWidthPercent={cellWidthPercent}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
