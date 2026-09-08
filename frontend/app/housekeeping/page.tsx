'use client';
import React, { useState } from 'react';
import { RoomStatusBoard } from '@/components/housekeeping/RoomStatusBoard';
import { TaskCard } from '@/components/housekeeping/TaskCard';
import MaintenanceParts from '@/components/housekeeping/MaintenanceParts';
import { MaintenanceTask } from '@/lib/types';

// Mock data per la demo
const MOCK_ROOMS = [
  { id: 'r1', number: '101', status: 'clean' },
  { id: 'r2', number: '102', status: 'dirty' },
  { id: 'r3', number: '103', status: 'clean' },
  { id: 'r4', number: '104', status: 'dirty' },
];

const MOCK_MAINTENANCE: MaintenanceTask[] = [
  {
    id: 'mt1',
    property_id: 'p1',
    room_id: 'r1',
    type: 'Aire condicionat',
    description: 'No refreda',
    priority: 2,
    status: 'pendent',
    created_by_id: 'u1',
    reported_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function HousekeepingPage() {
  const [activeTab, setActiveTab] = useState<'board' | 'maintenance'>('board');

  return (
    <div className="p-6 space-y-6 min-h-screen bg-[#1a1a2e] text-white">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#e2b04a]">Housekeeping</h1>
        <div className="flex bg-[#16213e] p-1 rounded-lg border border-slate-700">
          <button 
            onClick={() => setActiveTab('board')} 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'board' ? 'bg-[#e2b04a] text-[#1a1a2e]' : 'text-slate-400 hover:text-white'}`}
          >
            Room Board
          </button>
          <button 
            onClick={() => setActiveTab('maintenance')} 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'maintenance' ? 'bg-[#e2b04a] text-[#1a1a2e]' : 'text-slate-400 hover:text-white'}`}
          >
            SSTT Maintenance
          </button>
        </div>
      </div>
      
      {activeTab === 'board' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RoomStatusBoard rooms={MOCK_ROOMS} maintenanceTasks={MOCK_MAINTENANCE} />
          </div>
          <div className="space-y-4">
            <h2 className="text-lg font-bold mb-4">Pending Tasks</h2>
            <div className="space-y-3">
              {/* In a real app, this would come from API */}
              <p className="text-slate-500 italic text-sm">No pending cleaning tasks.</p>
            </div>
          </div>
        </div>
      ) : (
        <MaintenanceParts />
      )}
    </div>
  );
}
