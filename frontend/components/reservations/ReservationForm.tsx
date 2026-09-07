import React from 'react';

export function ReservationForm() {
  return (
    <form className="flex flex-col gap-4 p-6 bg-white rounded-xl border shadow-sm max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Guest Name</label>
          <input className="p-2 border rounded" type="text" placeholder="Full Name" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Room Type</label>
          <select className="p-2 border rounded">
            <option>Double Room</option>
            <option>Suite</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Check-in</label>
          <input className="p-2 border rounded" type="date" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Check-out</label>
          <input className="p-2 border rounded" type="date" />
        </div>
      </div>
      <button className="bg-brand-navy text-white p-2 rounded hover:bg-brand-dark transition-colors font-bold">
        Create Reservation
      </button>
    </form>
  );
}
