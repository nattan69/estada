'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Reservation } from '@/lib/types';
import { translations } from '@/lib/i18n';
import Link from 'next/link';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca');

  useEffect(() => {
    async function loadReservations() {
      try {
        const data = await api.reservations.list({});
        setReservations(data);
      } catch (e) {
        console.error('Error loading reservations:', e);
      } finally {
        setLoading(false);
      }
    }
    loadReservations();
  }, []);

  const t = translations[lang];

  return (
    <div className="p-6 bg-[#f8f9fa] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">{t.reservations}</h1>
        <div className="flex gap-4">
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value as any)}
            className="p-2 border rounded text-sm"
          >
            <option value="ca">Català</option>
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
          <Link 
            href="/reservations/new" 
            className="bg-[#e2b04a] text-[#1a1a2e] px-4 py-2 rounded font-medium hover:bg-[#d4a03a] transition-colors"
          >
            + {lang === 'ca' ? 'Nova Reserva' : lang === 'es' ? 'Nueva Reserva' : 'New Reservation'}
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Carregant...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1a1a2e] text-white">
              <tr>
                <th className="p-4 font-medium">Codi</th>
                <th className="p-4 font-medium">Hòspit</th>
                <th className="p-4 font-medium">Check-in</th>
                <th className="p-4 font-medium">Check-out</th>
                <th className="p-4 font-medium">Estatus</th>
                <th className="p-4 font-medium text-right">Acció</th>
              </tr>
            </thead>
            <tbody>
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-500">
                    No s'han trobat reserves.
                  </td>
                </tr>
              ) : (
                reservations.map((res) => (
                  <tr key={res.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-mono text-sm">{res.confirmation_code}</td>
                    <td className="p-4">{res.guest_id}</td>
                    <td className="p-4">{res.check_in}</td>
                    <td className="p-4">{res.check_out}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        res.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                        res.status === 'checked_in' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link 
                        href={`/reservations/${res.id}`} 
                        className="text-[#16213e] hover:text-[#e2b04a] font-medium transition-colors"
                      >
                        Detalls
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
