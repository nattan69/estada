'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function NewReservationPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    property_id: '',
    guest_id: '',
    room_type_id: '',
    rate_plan_id: '',
    check_in: '',
    check_out: '',
    adults: 1,
    children: 0,
    source: 'direct_web' as any,
    notes: '',
  });

  const [quote, setQuote] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getQuote = async () => {
    if (!formData.property_id || !formData.check_in || !formData.check_out) {
      alert('Si us plau, ompliu la propietat i les dates');
      return;
    }
    setLoading(true);
    try {
      const results = await api.availability.quote({
        property_id: formData.property_id,
        check_in: formData.check_in,
        check_out: formData.check_out,
        adults: formData.adults,
        children: formData.children,
        rate_plan_id: formData.rate_plan_id || undefined,
      });
      if (results && results.length > 0) {
        setQuote(results[0]);
      } else {
        alert('No hi ha disponibilitat per a aquestes dates');
        setQuote(null);
      }
    } catch (e) {
      console.error('Error calculating quote:', e);
      alert('Error al calcular el pressupost');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.reservations.create({
        property_id: formData.property_id,
        guest_id: formData.guest_id,
        room_type_id: formData.room_type_id,
        rate_plan_id: formData.rate_plan_id,
        check_in: formData.check_in,
        check_out: formData.check_out,
        adults: formData.adults,
        children: formData.children,
        source: formData.source,
        notes: formData.notes,
      });
      alert('Reserva creada correctament');
      router.push('/reservations');
    } catch (e) {
      console.error('Error creating reservation:', e);
      alert('Error al crear la reserva');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-[#f8f9fa] min-h-screen">
      <div className="mb-6 flex items-center gap-4">
        <Link 
          href="/reservations" 
          className="text-[#16213e] hover:text-[#e2b04a] flex items-center gap-1 transition-colors"
        >
          ← Tornar a la llista
        </Link>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Nova Reserva</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-lg font-semibold mb-4 text-[#1a1a2e]">Dades de la Reserva</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Propietat ID</label>
              <input 
                name="property_id" 
                value={formData.property_id} 
                onChange={handleInputChange}
                className="p-2 border rounded focus:ring-2 focus:ring-[#e2b04a] outline-none"
                placeholder="prop-uuid"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Hòspit ID</label>
              <input 
                name="guest_id" 
                value={formData.guest_id} 
                onChange={handleInputChange}
                className="p-2 border rounded focus:ring-2 focus:ring-[#e2b04a] outline-none"
                placeholder="guest-uuid"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Check-in</label>
              <input 
                type="date" 
                name="check_in" 
                value={formData.check_in} 
                onChange={handleInputChange}
                className="p-2 border rounded focus:ring-2 focus:ring-[#e2b04a] outline-none"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Check-out</label>
              <input 
                type="date" 
                name="check_out" 
                value={formData.check_out} 
                onChange={handleInputChange}
                className="p-2 border rounded focus:ring-2 focus:ring-[#e2b04a] outline-none"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Adults</label>
              <input 
                type="number" 
                name="adults" 
                value={formData.adults} 
                onChange={handleInputChange}
                className="p-2 border rounded focus:ring-2 focus:ring-[#e2b04a] outline-none"
                min="1"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Children</label>
              <input 
                type="number" 
                name="children" 
                value={formData.children} 
                onChange={handleInputChange}
                className="p-2 border rounded focus:ring-2 focus:ring-[#e2b04a] outline-none"
                min="0"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Tipus Habitació ID</label>
              <input 
                name="room_type_id" 
                value={formData.room_type_id} 
                onChange={handleInputChange}
                className="p-2 border rounded focus:ring-2 focus:ring-[#e2b04a] outline-none"
                placeholder="rt-uuid"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Plànol Tarifari ID</label>
              <input 
                name="rate_plan_id" 
                value={formData.rate_plan_id} 
                onChange={handleInputChange}
                className="p-2 border rounded focus:ring-2 focus:ring-[#e2b04a] outline-none"
                placeholder="rp-uuid"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Notes</label>
            <textarea 
              name="notes" 
              value={formData.notes} 
              onChange={handleInputChange}
              className="p-2 border rounded focus:ring-2 focus:ring-[#e2b04a] outline-none h-24"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={getQuote}
              disabled={loading}
              className="flex-1 py-2 bg-gray-100 text-[#1a1a2e] rounded font-medium hover:bg-gray-200 transition-colors"
            >
              {loading ? 'Calculant...' : 'Calcular Pressupost'}
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-2 bg-[#e2b04a] text-[#1a1a2e] rounded font-bold hover:bg-[#d4a03a] transition-colors"
            >
              {loading ? 'Creant...' : 'Confirmar Reserva'}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-[#e2b04a]">
            <h2 className="text-lg font-semibold mb-4 text-[#1a1a2e]">Resum del Pressupost</h2>
            {quote ? (
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Preu per nit</span>
                  <span className="font-medium">{quote.price} {quote.currency}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Nits</span>
                  <span className="font-medium">
                    {Math.ceil(
                      (new Date(formData.check_out).getTime() - new Date(formData.check_in).getTime()) / (1000 * 60 * 60 * 24)
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Taxes</span>
                  <span className="font-medium">{quote.taxes || 0} {quote.currency}</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-lg text-[#1a1a2e]">
                  <span>Total Estimat</span>
                  <span>{quote.total_amount} {quote.currency}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400 italic">
                Calcular el pressupost per veure el resum.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
