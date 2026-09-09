export type Role = 'owner' | 'admin' | 'manager' | 'reception' | 'housekeeping' | 'accounting';

export type ReservationStatus = 'quote' | 'confirmed' | 'checked_in' | 'checked_out' | 'canceled' | 'no_show';
export type ReservationSource = 'direct_web' | 'booking_engine' | 'phone' | 'walk_in' | 'ota' | 'channel_manager' | 'corporate' | 'ariadna';

export type RoomStatus = 'clean' | 'dirty' | 'inspected' | 'blocked' | 'out_of_service';

export type FolioStatus = 'open' | 'closed';
export type FolioKind = 'reservation' | 'guest' | 'city_ledger' | 'house' | string;
export type FolioItemType = 'room_night' | 'product' | 'service' | 'tax' | 'discount' | 'no_show_fee' | 'pos_charge';

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partially_refunded' | 'canceled';

export type HousekeepingTaskType = 'cleaning' | 'inspection' | 'maintenance' | 'turndown';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'canceled';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  name?: string;
  role: Role;
  active: boolean;
}

export interface Property {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  timezone: string;
  currency: string;
  address: any;
  active: boolean;
}

export interface RoomType {
  id: string;
  property_id: string;
  code: string;
  name: string;
  description?: string;
  max_adults: number;
  max_children: number;
  base_occupancy: number;
  active: boolean;
}

export interface Room {
  id: string;
  property_id: string;
  room_type_id: string;
  number: string;
  floor?: string;
  status: RoomStatus;
  active: boolean;
}

export interface RatePlan {
  id: string;
  property_id: string;
  code: string;
  name: string;
  description?: string;
  min_stay: number;
  max_stay?: number;
  policies?: any;
  active: boolean;
}

export interface Rate {
  id: string;
  room_type_id: string;
  rate_plan_id: string;
  date: string;
  price: number;
  currency: string;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
  stop_sell: boolean;
}

export interface Inventory {
  id: string;
  room_type_id: string;
  date: string;
  allotment: number;
  sold: number;
  blocked: number;
  overbooking_allowed: number;
}

export interface Guest {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  document_type?: string;
  document_number?: string;
  marketing_opt_in: boolean;
  notes?: string;
}

export interface Reservation {
  id: string;
  property_id: string;
  guest_id: string;
  room_type_id: string;
  rate_plan_id?: string;
  assigned_room_id?: string;
  confirmation_code: string;
  status: ReservationStatus;
  source: ReservationSource;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  total_amount: number;
  currency: string;
  notes?: string;
}

export interface ReservationNight {
  id: string;
  reservation_id: string;
  room_type_id: string;
  rate_plan_id?: string;
  date: string;
  base_rate: number;
  amount: number;
  taxes: number;
  discounts: number;
}

export interface Folio {
  id: string;
  property_id: string;
  reservation_id?: string;
  guest_id?: string;
  kind: FolioKind;
  status: FolioStatus;
  currency: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
}

export interface FolioItem {
  id: string;
  folio_id: string;
  type: FolioItemType;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
  posted_at: string;
}

export interface Payment {
  id: string;
  folio_id: string;
  provider: string;
  method?: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  external_ref?: string;
  idempotency_key: string;
}

export interface HousekeepingTask {
  id: string;
  property_id: string;
  room_id: string;
  type: HousekeepingTaskType;
  status: TaskStatus;
  priority: number;
  assigned_to_id?: string;
  created_by_id?: string;
  due_at?: string;
  notes?: string;
  completed_at?: string;
}

export type MaintenanceStatus = 'pendent' | 'en_curs' | 'en_espera_peca' | 'resolt' | 'cancelat';

export interface MaintenanceTask {
  id: string;
  property_id: string;
  room_id: string;
  type: string;
  description: string;
  priority: number;
  status: MaintenanceStatus;
  created_by_id?: string;
  reported_at: string;
  created_at: string;
  updated_at: string;
}

export interface FiscalRecord {
  id: string;
  property_id: string;
  folio_id: string;
  invoice_number: string;
  invoice_type: string;
  total: number;
  base_imponible: number;
  iva: number;
  irpf: number;
  vat_breakdown: Array<{
    rate: number;
    base: number;
    tax: number;
  }>;
  payload: any;
  payload_hash: string;
  hash: string;
  issued_at: string;
}

export interface ChainVerifyResponse {
  valid: boolean;
  total_records?: number;
  broken_at?: string;
  reason?: string;
}

export interface AgencyContract {
  id: string;
  property_id: string;
  agency_name: string;
  code: string;
  start_date: string;
  end_date: string;
  guarantee_type: 'free' | 'guaranteed';
  release_days: number;
  commission: number;
  cancellation_policy: string;
  active: boolean;
  allotments: ContractAllotment[];
}

export interface ContractAllotment {
  id: string;
  contract_id: string;
  room_type_id: string;
  date: string;
  allotment: number;
  sold: number;
  release_date: string;
  contracted_rate: number;
  discount_pct: number;
}

export interface ContractAuditResult {
  reservation_id: string;
  contract_id: string;
  agency_name: string;
  status: 'ok' | 'on_request' | 'rejected' | 'price_discrepancy' | 'released';
  reason: string;
  contracted_rate: number;
  applied_rate: number;
  release_date: string;
}

export interface NightAuditSummary {
  audit_date: string;
  rooms_total: number;
  rooms_occupied: number;
  occupancy_pct: number;
  arrivals: number;
  departures: number;
  no_shows: number;
  nights_posted: number;
  room_revenue: number;
  other_revenue: number;
  total_revenue: number;
  folios_closed: number;
  folios_open: number;
  payments_by_method?: Record<string, string>;
  payments_total?: string;
  extras_posted?: number;
  extras_revenue?: string;
}

export interface NightAudit {
  id: string;
  property_id: string;
  audit_date: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  created_by_id: string;
  summary: NightAuditSummary;
  error?: string;
}
