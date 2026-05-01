export type Role = 'jefe' | 'peluquero';
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'bizum';
export type AppointmentStatus = 'pending' | 'done' | 'cancelled';

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  created_at: string;
};

export type Barber = {
  id: string;
  name: string;
  active: boolean;
  display_order: number;
  created_at: string;
  // Consumidos por la web pública (webcoliseum) vía /api/public-config.
  // slot_key = identificador estable del slot de calendario (SLOT_1/2/3),
  // se mantiene aunque el dueño renombre al barbero.
  slot_key?: string | null;
  role?: string | null;
  bio?: string | null;
  hue?: number | null;
};

export type Service = {
  id: string;
  name: string;
  price: number;
  active: boolean;
  display_order: number;
  created_at: string;
  // duration_minutes determina los huecos que bloquea Apps Script.
  duration_minutes?: number | null;
  description?: string | null;
};

export type Ticket = {
  id: string;
  barber_id: string;
  service_id: string;
  amount: number;
  method: PaymentMethod;
  client: string | null;
  occurred_at: string;
  appointment_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type Appointment = {
  id: string;
  barber_id: string;
  service_id: string;
  appt_date: string;
  appt_time: string;
  client: string | null;
  status: AppointmentStatus;
  ticket_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & Pick<Profile, 'id' | 'email'>; Update: Partial<Profile> };
      barbers: { Row: Barber; Insert: Partial<Barber> & Pick<Barber, 'name'>; Update: Partial<Barber> };
      services: { Row: Service; Insert: Partial<Service> & Pick<Service, 'name' | 'price'>; Update: Partial<Service> };
      tickets: { Row: Ticket; Insert: Omit<Ticket, 'id' | 'created_at'> & Partial<Pick<Ticket, 'id'>>; Update: Partial<Ticket> };
      appointments: { Row: Appointment; Insert: Omit<Appointment, 'id' | 'created_at'> & Partial<Pick<Appointment, 'id'>>; Update: Partial<Appointment> };
    };
  };
};

export type TicketWithRelations = Ticket & {
  barber: Pick<Barber, 'id' | 'name'>;
  service: Pick<Service, 'id' | 'name'>;
};

export type AppointmentWithRelations = Appointment & {
  barber: Pick<Barber, 'id' | 'name'>;
  service: Pick<Service, 'id' | 'name' | 'price'>;
};
