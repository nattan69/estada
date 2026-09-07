import React from 'react';
import { Reservation } from '@/lib/types';

export function TapeChart({ reservations, rooms }: { reservations: Reservation[], rooms: any[] }) {
  return (
    <div className="overflow-x-auto p-4 bg-white border rounded-lg">
      <div className="min-w-[1200px]">
        <div className="grid grid-cols-[150px_repeat(31,1fr)] border-b bg-gray-100 font-semibold">
          <div className="p-2 border-r">Room</div>
          {Array.from({ length: 31 }).map((_, i) => (
            <div key={i} className="p-2 text-center border-r">{i + 1}</div>
          ))}
        </div>
        {rooms.map(room => (
          <div key={room.id} className="grid grid-cols-[150px_repeat(31,1fr)] border-b">
            <div className="p-2 border-r bg-gray-50">{room.number}</div>
            <div className="col-span-31 relative h-12">
              {/* Reservations would be mapped here as absolute positioned divs */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
