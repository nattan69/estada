import React from 'react';
import { RoomStatusBoard } from '@/components/housekeeping/RoomStatusBoard';
import { TaskCard } from '@/components/housekeeping/TaskCard';
import { api } from '@/lib/api';

export default async function HousekeepingPage() {
  const tasks = await api.housekeeping.listTasks({});

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Housekeeping</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RoomStatusBoard />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white mb-4">Pending Tasks</h2>
          <div className="space-y-3">
            {tasks?.map(task => (
              <TaskCard key={task.id} task={task} onComplete={(id) => {}} />
            ))}
            {(!tasks || tasks.length === 0) && <p className="text-slate-500 italic text-sm">No pending tasks.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
