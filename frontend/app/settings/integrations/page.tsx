'use client';

import React, { useState } from 'react';
import { translations } from '@/lib/i18n';

// Tipus per a les integracions
interface Integration {
  id: string;
  name: { ca: string; es: string; en: string };
  description: { ca: string; es: string; en: string };
  type: string;
  status: 'connected' | 'pending' | 'error';
  icon: string;
}

export default function IntegrationsSettingsPage() {
  // Gestió de l'idioma localment (com sol·licitat, ja que no hi ha hook useTranslation)
  const [lang, setLang] = useState<'ca' | 'es' | 'en'>('ca');

  const integrations: Integration[] = [
    {
      id: 'pos-room-charges',
      name: { 
        ca: 'Comanda (POS)', 
        es: 'Comanda (TPV)', 
        en: 'Comanda (POS)' 
      },
      description: { 
        ca: 'Càrrecs automàtics a l\'habitació des del TPV del restaurant/spa.', 
        es: 'Cargos automáticos a la habitación desde el TPV del restaurante/spa.', 
        en: 'Automatic room charges from the restaurant/spa POS.' 
      },
      type: 'POS',
      status: 'connected',
      icon: '🍽️',
    },
    {
      id: 'ariadna-ai',
      name: { 
        ca: 'Ariadna la Madona', 
        es: 'Ariadna la Madona', 
        en: 'Ariadna AI' 
      },
      description: { 
        ca: 'Recepcionista IA que gestiona reserves i l\'atenció al client.', 
        es: 'Recepcionista IA que gestiona reservas y la atención al cliente.', 
        en: 'AI Receptionist managing reservations and guest relations.' 
      },
      type: 'AI',
      status: 'connected',
      icon: '🤖',
    },
    {
      id: 'ota-webhook',
      name: { 
        ca: 'OTA / Channel Manager', 
        es: 'OTA / Channel Manager', 
        en: 'OTA / Channel Manager' 
      },
      description: { 
        ca: 'Sincronització de reserves d\'agències (Booking, Expedia) via webhook.', 
        es: 'Sincronización de reservas de agencias (Booking, Expedia) vía webhook.', 
        en: 'Agency reservation synchronization (Booking, Expedia) via webhook.' 
      },
      type: 'OTA',
      status: 'pending',
      icon: '🌐',
    },
    {
      id: 'vcc-payment',
      name: { 
        ca: 'Passarel·la VCC', 
        es: 'Pasarela VCC', 
        en: 'VCC Gateway' 
      },
      description: { 
        ca: 'Cobrament automàtic de targetes virtuals d\'agències.', 
        es: 'Cobro automático de tarjetas virtuales de agencias.', 
        en: 'Automatic charging of agency virtual credit cards.' 
      },
      type: 'Payments',
      status: 'pending',
      icon: '💳',
    },
  ];

  const statusColors = {
    connected: 'bg-green-500',
    pending: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  const statusLabels = {
    ca: { connected: 'Connectada', pending: 'Pendent', error: 'Error' },
    es: { connected: 'Conectada', pending: 'Pendiente', error: 'Error' },
    en: { connected: 'Connected', pending: 'Pending', error: 'Error' },
  };

  return (
    <div className=\"p-6 space-y-8 bg-[#1a1a2e] min-h-screen text-white\">
      <div className=\"flex justify-between items-center\">
        <h1 className=\"text-3xl font-bold text-white\">
          {translations[lang].settings} <span className=\"text-[#e2b04a]\">— Integracions</span>
        </h1>
        
        {/* Selector d'idioma simplificat */}
        <div className=\"flex gap-2\">
          {(['ca', 'es', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 text-xs font-bold rounded transition ${
                lang === l ? 'bg-[#e2b04a] text-[#1a1a2e]' : 'bg-[#16213e] text-white hover:bg-[#1f2d52]'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6\">
        {integrations.map((int) => (
          <div 
            key={int.id} 
            className=\"bg-[#16213e] border border-[#e2b04a]/20 rounded-xl p-5 hover:border-[#e2b04a]/50 transition-all group shadow-lg\"
          >
            <div className=\"flex justify-between items-start mb-4\">
              <div className=\"text-3xl\">{int.icon}</div>
              <div className=\"flex items-center gap-2\">
                <span className={`w-2 h-2 rounded-full ${statusColors[int.status]}`} />
                <span className=\"text-xs font-medium text-gray-400\">
                  {statusLabels[lang][int.status]}
                </span>
              </div>
            </div>

            <h3 className=\"text-xl font-semibold text-white mb-2 group-hover:text-[#e2b04a] transition-colors\">
              {int.name[lang]}
            </h3>
            <p className=\"text-gray-400 text-sm mb-6 leading-relaxed\">
              {int.description[lang]}
            </p>

            <button className=\"w-full py-2 px-4 bg-transparent border border-[#e2b04a] text-[#e2b04a] rounded-lg text-sm font-bold hover:bg-[#e2b04a] hover:text-[#1a1a2e] transition-all\">
              {lang === 'ca' ? 'Configurar' : lang === 'es' ? 'Configurar' : 'Configure'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
