import React from 'react';

export function RoomStatusBoard({ rooms }: { rooms: any[] }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {rooms.map(room => (
        <div key={room.id} className={`p-4 rounded-lg border-2 ${
          room.status === 'clean' ? 'bg-green-50 border-green-200' : 
          room.status === 'dirty' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="font-bold text-lg">Room {room.number}</div>
          <div className="text-sm uppercase">{room.status}</div>
        </div>
      ))}
    </div>
  );
}
