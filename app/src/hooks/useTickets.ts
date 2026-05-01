import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { TicketWithRelations } from '../types/db';

const SELECT = '*, barber:barbers(id,name), service:services(id,name)';

export function useTickets(opts: { from?: Date | null; to?: Date | null } = {}) {
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('tickets').select(SELECT).order('occurred_at', { ascending: false });
    if (opts.from) q = q.gte('occurred_at', opts.from.toISOString());
    if (opts.to) q = q.lt('occurred_at', opts.to.toISOString());
    const { data } = await q;
    setTickets((data ?? []) as unknown as TicketWithRelations[]);
    setLoading(false);
  }, [opts.from?.toISOString(), opts.to?.toISOString()]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tickets, loading, refresh };
}

export async function deleteTicket(id: string) {
  return supabase.from('tickets').delete().eq('id', id);
}

export async function updateTicket(
  id: string,
  payload: {
    barber_id: string;
    service_id: string;
    amount: number;
    method: 'efectivo' | 'tarjeta' | 'bizum';
    client?: string | null;
  },
) {
  return supabase.from('tickets').update(payload).eq('id', id);
}

export async function insertTicket(payload: {
  barber_id: string;
  service_id: string;
  amount: number;
  method: 'efectivo' | 'tarjeta' | 'bizum';
  client?: string | null;
  appointment_id?: string | null;
  created_by?: string | null;
}) {
  return supabase.from('tickets').insert({ ...payload, occurred_at: new Date().toISOString() }).select().single();
}
