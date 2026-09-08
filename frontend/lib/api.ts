import { 
  Reservation, 
  Folio, 
  FolioItem, 
  HousekeepingTask, 
  Rate, 
  Property, 
  Room, 
  Guest 
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// Mock Data for emergency fallback
const MOCKS = {
  reservations: [
    {
      id: 'res-1',
      property_id: 'prop-1',
      guest_id: 'gst-1',
      room_type_id: 'rt-1',
      confirmation_code: 'RES-ABCD123',
      status: 'confirmed',
      source: 'direct_web',
      check_in: '2026-09-10',
      check_out: '2026-09-15',
      adults: 2,
      children: 0,
      total_amount: 500,
      currency: 'EUR',
    }
  ],
  rooms: [
    { id: 'rm-1', property_id: 'prop-1', room_type_id: 'rt-1', number: '101', status: 'clean', active: true },
    { id: 'rm-2', property_id: 'prop-1', room_type_id: 'rt-1', number: '102', status: 'dirty', active: true },
  ],
  folios: [
    { id: 'fol-1', property_id: 'prop-1', reservation_id: 'res-1', guest_id: 'gst-1', kind: 'reservation', status: 'open', currency: 'EUR', total_amount: 500, paid_amount: 0, balance: 500 },
  ]
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (e) {
    console.warn(`Using mock for ${endpoint} due to error:`, e);
    const mockKey = endpoint.split('/')[1] as keyof typeof MOCKS;
    if (MOCKS[mockKey]) {
      return MOCKS[mockKey] as any;
    }
    throw e;
  }
}

export const api = {
  integrations: {
    posRoomCharge: (data: any) => request<any>(`/integrations/pos/room-charges`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': 'POS_API_KEY'
      },
      body: JSON.stringify(data)
    }),
    otaWebhook: (data: any) => request<any>(`/integrations/ota/webhook`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': 'OTA_API_KEY'
      },
      body: JSON.stringify(data)
    }),
    vccCharge: (data: any) => request<any>(`/integrations/payments/vcc`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': 'POS_API_KEY'
      },
      body: JSON.stringify(data)
    }),
  },
  rooms: {
    list: (params?: { propertyId?: string }) => 
      request<Room[]>(`/rooms${params?.propertyId ? `?${new URLSearchParams({ propertyId: params.propertyId })}` : ''}`),
    get: (id: string) => request<Room>(`/rooms/${id}`),
  },
  reservations: {
    list: (params: { propertyId?: string, date?: string, status?: string }) => 
      request<Reservation[]>(`/reservations?${new URLSearchParams(params)}`),
    get: (id: string) => request<Reservation>(`/reservations/${id}`),
    create: (data: any) => request<Reservation>(`/reservations`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(data) 
    }),
    cancel: (id: string) => request<void>(`/reservations/${id}/cancel`, { method: 'POST' }),
    checkIn: (id: string) => request<void>(`/reservations/${id}/check-in`, { method: 'POST' }),
    checkOut: (id: string) => request<void>(`/reservations/${id}/check-out`, { method: 'POST' }),
    assignRoom: (id: string, room_id: string) => request<void>(`/reservations/${id}/assign-room`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ room_id }) 
    }),
    changeRoom: (id: string, room_id: string) => request<void>(`/reservations/${id}/change-room`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ room_id }) 
    }),
  },
  availability: {
    search: (params: { propertyId: string, from: string, to: string, adults: number, children?: number, ratePlanId?: string }) => 
      request<any[]>(`/availability?${new URLSearchParams({
        propertyId: params.propertyId,
        from: params.from,
        to: params.to,
        adults: String(params.adults),
        ...(params.children !== undefined ? { children: String(params.children) } : {}),
        ...(params.ratePlanId ? { ratePlanId: params.ratePlanId } : {}),
      })}`),
    quote: (data: { property_id: string, check_in: string, check_out: string, adults: number, children: number, rate_plan_id?: string }) => 
      request<any[]>(`/reservations/quote`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(data) 
      }),
  },
  folios: {
    get: (id: string) => request<Folio>(`/folios/${id}`),
    listItems: (id: string) => request<FolioItem[]>(`/folios/${id}/items`),
    addCharge: (id: string, data: any) => request<void>(`/folios/${id}/charges`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(data) 
    }),
    addPayment: (id: string, data: any) => request<void>(`/folios/${id}/payments`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(data) 
    }),
    close: (id: string) => request<void>(`/folios/${id}/close`, { method: 'POST' }),
  },
  housekeeping: {
    listTasks: (params: any) => request<HousekeepingTask[]>(`/housekeeping/tasks?${new URLSearchParams(params)}`),
    updateTask: (id: string, data: any) => request<void>(`/housekeeping/tasks/${id}`, { 
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(data) 
    }),
    completeTask: (id: string) => request<void>(`/housekeeping/tasks/${id}/complete`, { method: 'POST' }),
  },
  rates: {
    list: (params: any) => request<Rate[]>(`/rates?${new URLSearchParams(params)}`),
    bulkUpsert: (data: any) => request<void>(`/rates/bulk-upsert`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(data) 
    }),
  },
  reports: {
    occupancy: (params: any) => request<any>(`/reports/occupancy?${new URLSearchParams(params)}`),
    revenue: (params: any) => request<any>(`/reports/revenue?${new URLSearchParams(params)}`),
    arrivals: (params: any) => request<any>(`/reports/front-desk/arrivals?${new URLSearchParams(params)}`),
    departures: (params: any) => request<any>(`/reports/front-desk/departures?${new URLSearchParams(params)}`),
  }
};