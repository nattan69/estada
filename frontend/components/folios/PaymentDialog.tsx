import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { api } from '@/lib/api';

export const PaymentDialog = ({ folioId, onClose, onRefresh }: { folioId: string, onClose: () => void, onRefresh: () => void }) => {
  const [payment, setPayment] = useState({ amount: 0, method: 'credit_card' });

  const handleSave = async () => {
    await api.folios.addPayment(folioId, payment);
    onRefresh();
    onClose();
  };

  return (
    <Dialog title="Register Payment" isOpen={true} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Amount</label>
          <input 
            type="number"
            className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white"
            value={payment.amount}
            onChange={e => setPayment({...payment, amount: parseFloat(e.target.value)})}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Method</label>
          <select 
            className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white"
            value={payment.method}
            onChange={e => setPayment({...payment, method: e.target.value})}
          >
            <option value="credit_card">Credit Card</option>
            <option value="cash">Cash</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
        <button 
          onClick={handleSave}
          className="w-full py-2 bg-gold-500 text-slate-900 font-bold rounded hover:bg-gold-400 transition-colors"
        >
          Confirm Payment
        </button>
      </div>
    </Dialog>
  );
};
