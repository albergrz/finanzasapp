import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { dateKey } from '../lib/format';
import type { AppointmentWithRelations, Barber, Service } from '../types/db';

const SELECT = '*, barber:barbers(id,name), service:services(id,name,price)';
const AGENDA_REFRESH_MS = Number(import.meta.env.VITE_AGENDA_REFRESH_MINUTES ?? 15) * 60 * 1000;

export function useAppointmentsForDate(date: Date) {
  const [items, setItems] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const dk = dateKey(date);

  const refresh = useCallback(async () => {
    setLoading(true);
    const calendarItems = await fetchGoogleAppointments(dk);
    if (calendarItems) {
      setItems(calendarItems);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('appointments')
      .select(SELECT)
      .eq('appt_date', dk)
      .order('appt_time');
    setItems((data ?? []) as unknown as AppointmentWithRelations[]);
    setLoading(false);
  }, [dk]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!AGENDA_REFRESH_MS || AGENDA_REFRESH_MS < 60_000) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, AGENDA_REFRESH_MS);

    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') refresh();
    }

    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  return { appointments: items, loading, refresh };
}

export async function insertAppointment(payload: {
  barber_id: string;
  service_id: string;
  appt_date: string;
  appt_time: string;
  client?: string | null;
  created_by?: string | null;
}) {
  const calendarPayload = await payloadWithNames(payload);
  if (calendarPayload) {
    const response = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(calendarPayload),
    });
    if (response.ok) return { data: await response.json(), error: null };
    if (response.status !== 501) {
      const data = await response.json().catch(() => ({}));
      return { data: null, error: { message: data.error || 'No se pudo crear la cita en Google Calendar' } };
    }
  }
  return supabase.from('appointments').insert({ ...payload, status: 'pending' }).select().single();
}

export async function cancelAppointment(id: string) {
  if (id.startsWith('google:')) {
    return updateGoogleAppointment(id, 'cancel');
  }
  return supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
}

export async function markAppointmentDone(id: string, ticket_id: string) {
  if (id.startsWith('google:')) {
    return updateGoogleAppointment(id, 'done', ticket_id);
  }
  return supabase.from('appointments').update({ status: 'done', ticket_id }).eq('id', id);
}

async function fetchGoogleAppointments(date: string): Promise<AppointmentWithRelations[] | null> {
  try {
    const response = await fetch(`/api/calendar/events?date=${date}`);
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return null;
    const [{ data: barbers }, { data: services }, calendar] = await Promise.all([
      supabase.from('barbers').select('*').eq('active', true),
      supabase.from('services').select('*').eq('active', true),
      response.json(),
    ]);
    return (calendar.events || []).map((event: GoogleCalendarEvent) =>
      mapGoogleEvent(event, barbers ?? [], services ?? []),
    );
  } catch {
    return null;
  }
}

async function payloadWithNames(payload: {
  barber_id: string;
  service_id: string;
  appt_date: string;
  appt_time: string;
  client?: string | null;
}) {
  const [{ data: barber }, { data: service }] = await Promise.all([
    supabase.from('barbers').select('name').eq('id', payload.barber_id).single(),
    supabase.from('services').select('name').eq('id', payload.service_id).single(),
  ]);
  if (!barber || !service) return null;
  return {
    ...payload,
    barber_name: barber.name,
    service_name: service.name,
  };
}

async function updateGoogleAppointment(id: string, action: 'done' | 'cancel', ticket_id?: string) {
  const response = await fetch('/api/calendar/events', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ event_id: id, action, ticket_id }),
  });
  if (response.ok) return { data: await response.json(), error: null };
  const data = await response.json().catch(() => ({}));
  return { data: null, error: { message: data.error || 'No se pudo actualizar Google Calendar' } };
}

type GoogleCalendarEvent = {
  id: string;
  google_event_id: string;
  barber_name: string;
  service_name: string;
  client: string | null;
  status: 'pending' | 'done' | 'cancelled';
  appt_date: string;
  appt_time: string;
};

function normalizeName(value: string) {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function findByName<T extends { name: string }>(items: T[], name: string) {
  const normalized = normalizeName(name);
  if (!normalized) return undefined;
  return (
    items.find((item) => normalizeName(item.name) === normalized) ??
    items.find((item) => normalizeName(item.name).startsWith(normalized)) ??
    items.find((item) => normalized.startsWith(normalizeName(item.name)))
  );
}

function mapGoogleEvent(
  event: GoogleCalendarEvent,
  barbers: Barber[],
  services: Service[],
): AppointmentWithRelations {
  const barber = findByName(barbers, event.barber_name);
  const service = findByName(services, event.service_name);
  return {
    id: event.id,
    barber_id: barber?.id ?? 'google-barber',
    service_id: service?.id ?? 'google-service',
    appt_date: event.appt_date,
    appt_time: `${event.appt_time}:00`,
    client: event.client,
    status: event.status,
    ticket_id: null,
    created_by: null,
    created_at: new Date().toISOString(),
    barber: { id: barber?.id ?? 'google-barber', name: barber?.name ?? event.barber_name ?? 'Sin peluquero' },
    service: {
      id: service?.id ?? 'google-service',
      name: service?.name ?? event.service_name ?? 'Cita',
      price: service?.price ?? 0,
    },
  };
}
