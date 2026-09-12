import { 
  Reservation, 
  Folio, 
  FolioItem, 
  HousekeepingTask, 
  Rate, 
  Property, 
  Room, 
  Guest,
  FiscalRecord,
  ChainVerifyResponse,
  User,
  NightAudit,
  NightAuditSummary,
  AgencyContract,
  ContractAllotment,
  ContractAuditResult,
  MaintenanceTask,
  RoomType,
  RatePlan
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// Mock Data for emergency fallback with explicit typing
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
  ] as Reservation[],
  rooms: [
    { id: 'rm-1', property_id: 'prop-1', room_type_id: 'rt-1', number: '101', status: 'clean', active: true },
    { id: 'rm-2', property_id: 'prop-1', room_type_id: 'rt-1', number: '102', status: 'dirty', active: true },
  ] as Room[],
  guests: [
    {
      id: 'gst-1',
      tenant_id: 'ten-1',
      first_name: 'Joan',
      last_name: 'Planells',
      email: 'joan@example.com',
      phone: '+34 600 000 000',
      document_type: 'DNI',
      document_number: '12345678X',
      marketing_opt_in: true,
      notes: 'Preferència planta baixa',
    }
  ] as Guest[],
  users: [
    {
      id: 'usr-1',
      tenant_id: 'ten-1',
      email: 'admin@estada.com',
      name: 'Administrador',
      role: 'owner',
      active: true,
    }
  ] as User[],
  folios: [
    { id: 'fol-1', property_id: 'prop-1', reservation_id: 'res-1', guest_id: 'gst-1', kind: 'reservation', status: 'open', currency: 'EUR', total_amount: 500, paid_amount: 0, balance: 500 },
  ] as Folio[],
  fiscal: {
    records: [
      {
        id: 'fisc-1',
        property_id: 'prop-1',
        folio_id: 'fol-1',
        invoice_number: 'SEQ-2026-00001',
        invoice_type: 'simplified',
        total: 540,
        base_imponible: 450,
        iva: 90,
        irpf: 0,
        vat_breakdown: [
          { rate: 10, base: 450, tax: 45 },
          { rate: 10, base: 450, tax: 45 },
        ],
        payload: { customer: 'Guest 1', items: ['Stay'] },
        previous_hash: '0000000000000000',
        payload_hash: 'hash-p1',
        hash: 'hash-1',
        issued_at: '2026-09-01T10:00:00Z',
      }
    ] as FiscalRecord[],
    verify: {
      valid: true,
      total_records: 1,
    } as ChainVerifyResponse,
  },
  nightAudit: [
    {
      id: 'audit-1',
      property_id: 'prop-1',
      audit_date: '2026-09-07',
      status: 'completed',
      started_at: '2026-09-07T23:50:00Z',
      completed_at: '2026-09-08T00:05:00Z',
      created_by_id: 'usr-1',
      summary: {
        audit_date: '2026-09-07',
        rooms_total: 20,
        rooms_occupied: 15,
        occupancy_pct: 75,
        arrivals: 5,
        departures: 4,
        no_shows: 1,
        nights_posted: 15,
        room_revenue: 1200,
        other_revenue: 150,
        total_revenue: 1350,
        folios_closed: 4,
        folios_open: 11,
      },
    },
    {
      id: 'audit-2',
      property_id: 'prop-1',
      audit_date: '2026-09-06',
      status: 'failed',
      started_at: '2026-09-06T23:55:00Z',
      error: 'Error posting room charges for room 104',
      summary: {
        audit_date: '2026-09-06',
        rooms_total: 20,
        rooms_occupied: 12,
        occupancy_pct: 60,
        arrivals: 3,
        departures: 6,
        no_shows: 2,
        nights_posted: 12,
        room_revenue: 900,
        other_revenue: 80,
        total_revenue: 980,
        folios_closed: 6,
        folios_open: 11,
      },
    },
  ] as NightAudit[],
  contracts: [
    {
      id: 'con-1',
      property_id: 'prop-1',
      agency_name: 'Booking.com',
      code: 'BOK-2026',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      guarantee_type: 'guaranteed',
      release_days: 7,
      commission: 15,
      cancellation_policy: 'Standard 48h',
      active: true,
      allotments: [
        {
          id: 'all-1',
          contract_id: 'con-1',
          room_type_id: 'rt-1',
          date: '2026-09-10',
          allotment: 5,
          sold: 2,
          release_date: '2026-09-03',
          contracted_rate: 120,
          discount_pct: 0,
        }
      ]
    }
  ] as AgencyContract[],
  maintenance: [
    {
      id: 'maint-1',
      property_id: 'prop-1',
      room_id: 'rm-1',
      type: 'Electricitat',
      description: 'La llum de la habitació no funciona',
      priority: 1,
      status: 'pendent',
      created_by_id: 'usr-1',
      reported_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'maint-2',
      property_id: 'prop-1',
      room_id: 'rm-2',
      type: 'Plomeria',
      description: 'Gotera al bany',
      priority: 2,
      status: 'en_curs',
      created_by_id: 'usr-1',
      reported_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ] as MaintenanceTask[],
  properties: [
    {
      id: 'prop-1',
      tenant_id: 'ten-1',
      name: 'Hotel Estada Center',
      code: 'EST-CTR',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      address: { street: 'Carrer Major 1', city: 'Barcelona', zip: '08001' },
      active: true,
    }
  ] as Property[],
  roomTypes: [
    {
      id: 'rt-1',
      property_id: 'prop-1',
      code: 'DBL',
      name: 'Habitación Doble',
      description: 'Habitació doble estàndard amb llit matrimonial',
      max_adults: 2,
      max_children: 1,
      base_occupancy: 2,
      active: true,
    }
  ] as RoomType[],
  ratePlans: [
    {
      id: 'rp-1',
      property_id: 'prop-1',
      code: 'BAR',
      name: 'Best Available Rate',
      description: 'Tarifa estàndard sense restriccions',
      min_stay: 1,
      max_stay: 30,
      policies: { cancel_days: 24, deposit: false },
      active: true,
    }
  ] as RatePlan[],
};

// ============================================================
// Gestió del token d'auth (JWT) — guardar/leure/esborrar
// ============================================================
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('estada_access_token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('estada_refresh_token');
}

export function setTokens(access_token: string, refresh_token: string): void {
  localStorage.setItem('estada_access_token', access_token);
  localStorage.setItem('estada_refresh_token', refresh_token);
}

export function logout(): void {
  localStorage.removeItem('estada_access_token');
  localStorage.removeItem('estada_refresh_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    // Afegir el header Authorization: Bearer si hi ha token guardat
    const token = getToken();
    if (token) {
      options.headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    }
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      // Sessió expirada o token invàlid → redirigir a login (no caure als mocks).
      if (response.status === 401) {
        logout();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
      let detail = `API error: ${response.status}`;
      try {
        const body = await response.json();
        if (body && body.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      } catch { /* sense cos d'error JSON */ }
      const err: any = new Error(detail);
      err.status = response.status;
      throw err;
    }
    if (response.status === 204) return undefined as T;
    return await response.json();
  } catch (e: any) {
    if (e && e.status) throw e; // Error HTTP real: propagar-lo, no emmascarar-lo amb mocks
    console.warn(`Using mock for ${endpoint} due to error:`, e);
    
    if (endpoint.startsWith('/api/v1/fiscal/records')) {
        if (endpoint.includes('/records/')) {
            return MOCKS.fiscal.records[0] as any;
        }
        return MOCKS.fiscal.records as any;
    }
    if (endpoint.startsWith('/api/v1/fiscal/chain/verify')) {
        return MOCKS.fiscal.verify as any;
    }
    if (endpoint.startsWith('/api/v1/night-audit')) {
        if (endpoint.includes('/run')) return MOCKS.nightAudit[0] as any;
        if (endpoint.includes('/')) {
            const id = endpoint.split('/').pop();
            return MOCKS.nightAudit.find(a => a.id === id) || MOCKS.nightAudit[0] as any;
        }
        return MOCKS.nightAudit as any;
    }
    if (endpoint.startsWith('/api/v1/contracts')) {
        if (endpoint.includes('/audit/')) return {
            reservation_id: 'res-1',
            contract_id: 'con-1',
            agency_name: 'Booking.com',
            status: 'ok',
            reason: 'Correct rate applied',
            contracted_rate: 120,
            applied_rate: 120,
            release_date: '2026-09-03'
        } as any;
        if (endpoint.includes('/release')) return { released: 5 } as any;
        if (endpoint.includes('/')) {
            const id = endpoint.split('/').pop();
            return MOCKS.contracts.find(c => c.id === id) || MOCKS.contracts[0] as any;
        }
        return MOCKS.contracts as any;
    }
    if (endpoint.startsWith('/api/v1/maintenance')) {
        if (endpoint.includes('/resolve')) {
            const id = endpoint.split('/').pop();
            const task = MOCKS.maintenance.find(t => t.id === id);
            return { ...task, status: 'resolt', resolved_at: new Date().toISOString() } as any;
        }
        if (endpoint.includes('/')) {
            const id = endpoint.split('/').pop();
            return MOCKS.maintenance.find(t => t.id === id) || MOCKS.maintenance[0] as any;
        }
        return MOCKS.maintenance as any;
    }

    const mockKey = endpoint.split('/').filter(Boolean)[2] as keyof typeof MOCKS;
    if (MOCKS[mockKey]) {
      return MOCKS[mockKey] as any;
    }
    throw e;
  }
}

export const api = {
  integrations: {
    posRoomCharge: (data: any) => request<any>(`/api/v1/integrations/pos/room-charges`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': 'POS_API_KEY'
      },
      body: JSON.stringify(data)
    }),
    otaWebhook: (data: any) => request<any>(`/api/v1/integrations/ota/webhook`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Key': 'OTA_API_KEY'
      },
      body: JSON.stringify(data)
    }),
    vccCharge: (data: any) => request<any>(`/api/v1/integrations/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  },
  rooms: {
    list: (params?: { propertyId?: string }) => 
      request<Room[]>(`/api/v1/rooms${params?.propertyId ? '?' + new URLSearchParams({ propertyId: params.propertyId }).toString() : ''}`),
    get: (id: string) => request<Room>(`/api/v1/rooms/${id}`),
    create: (data: any) => request<Room>(`/api/v1/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => request<Room>(`/api/v1/rooms/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    updateStatus: (id: string, data: any) => request<Room>(`/api/v1/rooms/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    delete: (id: string) => request<void>(`/api/v1/rooms/${id}`, {
      method: 'DELETE',
    }),
  },
  guests: {
    list: (params?: { email?: string }) => 
      request<Guest[]>(`/api/v1/guests${params?.email ? '?' + new URLSearchParams({ email: params.email }).toString() : ''}`),
    get: (id: string) => request<Guest>(`/api/v1/guests/${id}`),
    create: (data: any) => request<Guest>(`/api/v1/guests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => request<Guest>(`/api/v1/guests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    delete: (id: string) => request<void>(`/api/v1/guests/${id}`, {
      method: 'DELETE',
    }),
  },
  users: {
    list: () => request<User[]>(`/api/v1/users`),
    get: (id: string) => request<User>(`/api/v1/users/${id}`),
    create: (data: any) => request<User>(`/api/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => request<User>(`/api/v1/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    remove: (id: string) => request<void>(`/api/v1/users/${id}`, { method: 'DELETE' }),
  },
  reservations: {
    list: (params: { propertyId?: string, date?: string, status?: string }) => 
      request<Reservation[]>(`/api/v1/reservations?${new URLSearchParams(params)}`),
    get: (id: string) => request<Reservation>(`/api/v1/reservations/${id}`),
    create: (data: any) => request<Reservation>(`/api/v1/reservations`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(data) 
    }),
    cancel: (id: string) => request<void>(`/api/v1/reservations/${id}/cancel`, { method: 'POST' }),
    checkIn: (id: string) => request<void>(`/api/v1/reservations/${id}/check-in`, { method: 'POST' }),
    checkOut: (id: string) => request<void>(`/api/v1/reservations/${id}/check-out`, { method: 'POST' }),
    assignRoom: (id: string, room_id: string) => request<void>(`/api/v1/reservations/${id}/assign-room`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ room_id }) 
    }),
    changeRoom: (id: string, room_id: string) => request<void>(`/api/v1/reservations/${id}/change-room`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ room_id }) 
    }),
  },
  availability: {
    search: (params: { propertyId: string, from: string, to: string, adults: number, children?: number, ratePlanId?: string }) => 
      request<any[]>(`/api/v1/availability?${new URLSearchParams({
        propertyId: params.propertyId,
        from: params.from,
        to: params.to,
        adults: String(params.adults),
        ...(params.children !== undefined ? { children: String(params.children) } : {}),
        ...(params.ratePlanId ? { ratePlanId: params.ratePlanId } : {}),
      })}`),
    quote: (data: { property_id: string, check_in: string, check_out: string, adults: number, children: number, rate_plan_id?: string }) => 
      request<any[]>(`/api/v1/reservations/quote`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(data) 
    }),
  },
  folios: {
    get: (id: string) => request<Folio>(`/api/v1/folios/${id}`),
    listItems: (id: string) => request<FolioItem[]>(`/api/v1/folios/${id}/items`),
    addCharge: (id: string, data: any) => request<void>(`/api/v1/folios/${id}/charges`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(data) 
    }),
    addPayment: (id: string, data: any) => request<void>(`/api/v1/folios/${id}/payments`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(data) 
    }),
    close: (id: string) => request<void>(`/api/v1/folios/${id}/close`, { method: 'POST' }),
  },
  housekeeping: {
    listTasks: (params: any) => request<HousekeepingTask[]>(`/api/v1/housekeeping/tasks?${new URLSearchParams(params)}`),
    updateTask: (id: string, data: any) => request<HousekeepingTask>(`/api/v1/housekeeping/tasks/${id}`, { 
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(data) 
    }),
    completeTask: (id: string) => request<void>(`/api/v1/housekeeping/tasks/${id}/complete`, { method: 'POST' }),
  },
  rates: {
    list: (params: any) => request<Rate[]>(`/api/v1/rates?${new URLSearchParams(params)}`),
    bulkUpsert: (data: any) => request<void>(`/api/v1/rates/bulk-upsert`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(data) 
    }),
  },
  reports: {
    occupancy: (params: any) => request<any>(`/api/v1/reports/occupancy?${new URLSearchParams(params)}`),
    revenue: (params: any) => request<any>(`/api/v1/reports/revenue?${new URLSearchParams(params)}`),
    arrivals: (params: any) => request<any>(`/api/v1/reports/front-desk/arrivals?${new URLSearchParams(params)}`),
    departures: (params: any) => request<any>(`/api/v1/reports/front-desk/departures?${new URLSearchParams(params)}`),
  },
  fiscal: {
    listRecords: (params: { propertyId?: string, from?: string, to?: string }) => 
      request<FiscalRecord[]>(`/api/v1/fiscal/records?${new URLSearchParams(params)}`),
    getRecord: (id: string) => 
      request<FiscalRecord>(`/api/v1/fiscal/records/${id}`),
    verifyChain: (propertyId: string) => 
      request<ChainVerifyResponse>(`/api/v1/fiscal/chain/verify?${new URLSearchParams({ propertyId })}`),
  },
  nightAudit: {
    run: (data: { property_id: string, audit_date?: string }) => 
      request<NightAudit>(`/api/v1/night-audit/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
    list: (params: { propertyId?: string, audit_date?: string }) => 
      request<NightAudit[]>(`/api/v1/night-audit?${new URLSearchParams(params)}`),
    get: (id: string) => request<NightAudit>(`/api/v1/night-audit/${id}`),
  },
  contracts: {
    list: (params?: { propertyId?: string }) => 
      request<AgencyContract[]>(`/api/v1/contracts${params?.propertyId ? '?' + new URLSearchParams({ propertyId: params.propertyId }).toString() : ''}`),
    get: (id: string) => request<AgencyContract>(`/api/v1/contracts/${id}`),
    create: (data: any) => request<AgencyContract>(`/api/v1/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => request<AgencyContract>(`/api/v1/contracts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    remove: (id: string) => request<void>(`/api/v1/contracts/${id}`, {
      method: 'DELETE',
    }),
    addAllotment: (id: string, data: any) => request<ContractAllotment>(`/api/v1/contracts/${id}/allotments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    audit: (reservationId: string) => request<ContractAuditResult>(`/api/v1/contracts/audit/${reservationId}`),
    release: (params: { property_id: string, as_of?: string }) => request<{ released: number }>(`/api/v1/contracts/release?${new URLSearchParams(params)}`, {
      method: 'POST',
    }),
  },
  maintenance: {
    list: (params?: { propertyId?: string, roomId?: string, status?: string }) => 
      request<MaintenanceTask[]>(`/api/v1/maintenance?${new URLSearchParams(params || {})}`),
    create: (data: any) => request<MaintenanceTask>(`/api/v1/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => request<MaintenanceTask>(`/api/v1/maintenance/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    resolve: (id: string) => request<MaintenanceTask>(`/api/v1/maintenance/${id}/resolve`, {
      method: 'POST'
    }),
  },
  properties: {
    list: () => request<Property[]>(`/api/v1/properties`),
    get: (id: string) => request<Property>(`/api/v1/properties/${id}`),
    create: (data: any) => request<Property>(`/api/v1/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => request<Property>(`/api/v1/properties/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  },
  roomTypes: {
    list: () => request<RoomType[]>(`/api/v1/room-types`),
    get: (id: string) => request<RoomType>(`/api/v1/room-types/${id}`),
    create: (data: any) => request<RoomType>(`/api/v1/room-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => request<RoomType>(`/api/v1/room-types/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  },
  ratePlans: {
    list: () => request<RatePlan[]>(`/api/v1/rate-plans`),
    get: (id: string) => request<RatePlan>(`/api/v1/rate-plans/${id}`),
    create: (data: any) => request<RatePlan>(`/api/v1/rate-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    update: (id: string, data: any) => request<RatePlan>(`/api/v1/rate-plans/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
  },
  // Auth JWT real — SENSE fallback al mock (si el backend cau, el login falla i és correcte)
  auth: {
    login: (email: string, password: string) =>
      fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      }).then(async (r) => {
        if (!r.ok) throw new Error(`Login fallat: ${r.status}`);
        const data = await r.json();
        setTokens(data.access_token, data.refresh_token);
        return data;
      }),
    refresh: (refresh_token: string) =>
      fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token })
      }).then(async (r) => {
        if (!r.ok) throw new Error(`Refresh fallat: ${r.status}`);
        const data = await r.json();
        setTokens(data.access_token, data.refresh_token);
        return data;
      }),
    me: () => request<User>(`/api/v1/auth/me`),
  }
};