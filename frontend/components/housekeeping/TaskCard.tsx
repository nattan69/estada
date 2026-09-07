import React from 'react';
import { HousekeepingTask } from '@/lib/types';

export const TaskCard = ({ task, onComplete }: { task: HousekeepingTask, onComplete: (id: string) => void }) => {
  return (
    <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-between text-white">
      <div className="flex flex-col">
        <span className="text-xs text-slate-400">Room {task.room_id}</span>
        <span className="font-bold capitalize">{task.type.replace('_', ' ')}</span>
        <span className={`text-xs ${task.priority > 2 ? 'text-red-400' : 'text-slate-400'}`}>
          Priority: {task.priority}
        </span>
      </div>
      <button 
        onClick={() => onComplete(task.id)}
        className="px-3 py-1 bg-gold-500 text-slate-900 text-xs font-bold rounded hover:bg-gold-400"
      >
        Done
      </button>
    </div>
  );
};
