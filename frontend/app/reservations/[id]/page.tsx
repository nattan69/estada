'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Reservation } from '@/lib/types';
import Link from 'next/link';

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReservation() {
      try {
        const data = await api.reservations.get(params.id as string);
        setReservation(data);
      } catch (e) {
        console.error('Error loading reservation:', e);
      } finally {
        setLoading(false);
      }
    }
    loadReservation();
  }, [params.id]);

  if (loading) return <div className="p-6 text-center">Carregant...</div>;
  if (!reservation) return <div className="p-6 text-center">Reserva no trobada.</div>;

  return (
    <div className="p-6 bg-[#f8f9fa] min-h-screen">
      <div className="mb-6 flex items-center gap-4">
        <Link 
          href="/reservations" 
          className="text-[#16213e] hover:text-[#e2b04a] flex items-center gap-1 transition-colors"
        >
          ← Tornar a la llista
        </Link>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">
          Reserva {reservation.confirmation_code}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2 text-[#1a1a2e]">Informació General</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 block">Hòspit ID</label>
                <p className="font-medium">{reservation.guest_id}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500 block">Estatus</label>
                <p className="font-medium">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                    reservation.status === 'checked_in' ? 'bg-blue-100 text-blue-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {reservation.status}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500 block">Check-in</label>
                <p className="font-medium">{reservation.check_in}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500 block">Check-out</label>
                <p className="font-medium">{reservation.check_out}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500 block">Adults</label>
                <p className="font-medium">{reservation.adults}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500 block">Children</label>
                <p className="font-medium">{reservation.children}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow border-t-4 border-[#e2b04a]">
            <h2 className="text-lg font-semibold mb-4 text-[#1a1a2e]">Pagaments</h2>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Total</span>
              <span className="font-bold text-xl text-[#1a1a2e]">
                {reservation.total_amount} {reservation.currency}
              </span>
            </div>
            <div className="mt-6 space-y-3">
              <button 
                onClick={async () => {
                  await api.reservations.checkIn(reservation.id);
                  router.refresh();
                }}
                disabled={reservation.status !== 'confirmed'}
                className="w-full py-2 bg-[#1a1a2e] text-white rounded hover:bg-[#16213e] disabled:opacity-50 transition-colors"
              >
                Realitzar Check-in
              </button>
              <button 
                onClick={async () => {
                  await api.reservations.checkOut(reservation.id);
                  router.refresh();
                }}
                disabled={reservation.status !== 'checked_in'}
                className="w-full py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
              >
                Realitzar Check-out
              </button>
              <button 
                onClick={async () => {
                  if(confirm('Sigueu segur que vol cancel·lar aquesta reserva?')) {
                    await api.reservations.cancel(reservation.id);
                    router.refresh();
                  }
                }}
                className="w-full py-2 border border-red-500 text-red-500 rounded hover:bg-red-50 transition-colors"
              >
                Cancel·lar Reserva
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
