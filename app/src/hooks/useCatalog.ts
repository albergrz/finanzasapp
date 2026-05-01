import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Barber, Service } from '../types/db';

export function useCatalog() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [b, s] = await Promise.all([
      supabase.from('barbers').select('*').eq('active', true).order('display_order'),
      supabase.from('services').select('*').eq('active', true).order('display_order'),
    ]);
    setBarbers(b.data ?? []);
    setServices(s.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { barbers, services, loading, refresh };
}
