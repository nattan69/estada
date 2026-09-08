import React from 'react';
import { RoomStatus, MaintenanceTask } from '@/lib/types';

export function RoomStatusBoard({ rooms, maintenanceTasks = [] }: { rooms: any[], maintenanceTasks?: MaintenanceTask[] }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {rooms.map(room => {
        const hasUnresolvedMaintenance = maintenanceTasks.some(mt => 
          mt.room_id === room.id && ['pendent', 'en_curs', 'en_espera_peca'].includes(mt.status)
        );
        
        const effectiveStatus = hasUnresolvedMaintenance ? 'out_of_service' : room.status;
        
        const statusStyles = {
          clean: 'bg-green-50 border-green-200 text-green-700',
          dirty: 'bg-red-50 border-red-200 text-red-700',
          inspected: 'bg-blue-50 border-blue-200 text-blue-700',
          blocked: 'bg-yellow-50 border-yellow-200 text-yellow-700',
          out_of_service: 'bg-gray-800 border-gray-900 text-white font-bold'
        };

        return (
          <div key={room.id} className={`p-4 rounded-lg border-2 ${statusStyles[effectiveStatus as keyof typeof statusStyles] || 'bg-gray-50 border-gray-200'}`}>
            <div className="font-bold text-lg">Room {room.number}</div>
            <div className="text-xs uppercase">{hasUnresolvedMaintenance ? '⚠️ Maintenance' : effectiveStatus}</div>
          </div>
        );
      })}
    </div>
  );
}
