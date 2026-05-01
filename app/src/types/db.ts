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
};

export type Service = {
  id: string;
  name: string;
  price: number;
  active: boolean;
  display_order: number;
  created_at: string;
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
