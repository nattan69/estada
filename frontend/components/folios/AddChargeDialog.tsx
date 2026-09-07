import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { api } from '@/lib/api';

export const AddChargeDialog = ({ folioId, onClose, onRefresh }: { folioId: string, onClose: () => void, onRefresh: () => void }) => {
  const [charge, setCharge] = useState({ description: '', amount: 0, type: 'service' });

  const handleSave = async () => {
    await api.folios.addCharge(folioId, charge);
    onRefresh();
    onClose();
  };

  return (
    <Dialog title="Add Charge" isOpen={true} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Description</label>
          <input 
            className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white"
            value={charge.description}
            onChange={e => setCharge({...charge, description: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Amount</label>
          <input 
            type="number"
            className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white"
            value={charge.amount}
            onChange={e => setCharge({...charge, amount: parseFloat(e.target.value)})}
          />
        </div>
        <button 
          onClick={handleSave}
          className="w-full py-2 bg-gold-500 text-slate-900 font-bold rounded hover:bg-gold-400 transition-colors"
        >
          Save Charge
        </button>
      </div>
    </Dialog>
  );
};
