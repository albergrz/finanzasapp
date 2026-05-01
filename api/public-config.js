// GET /api/public-config
// Endpoint público (sin auth) que expone barbers + services activos para
// que la web de citas (webcoliseum) los pinte sin tocar código cuando
// la barbería cambia un barbero o un precio.
//
// CORS abierto: cualquiera puede leer. Solo expone datos no sensibles.
// Si Supabase no está configurado, devuelve 501 y la web cae a su fallback hardcoded.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function setCors(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=300');
}

function json(res, status, body) {
  setCors(res);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function sb(path) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const r = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'content-type': 'application/json',
    },
  });
  if (!r.ok) throw new Error(`Supabase ${path} → ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json(res, 501, { error: 'Supabase not configured' });
  }

  try {
    const [barbersRaw, servicesRaw] = await Promise.all([
      sb('barbers?select=slot_key,name,role,bio,hue,active,display_order&active=eq.true&order=display_order.asc'),
      sb('services?select=name,price,duration_minutes,description,active,display_order&active=eq.true&order=display_order.asc'),
    ]);

    const barbers = barbersRaw
      .filter((b) => b.slot_key)
      .map((b) => ({
        slot_key: b.slot_key,
        name: b.name,
        role: b.role || '',
        bio: b.bio || '',
        hue: typeof b.hue === 'number' ? b.hue : 75,
      }));

    const services = servicesRaw.map((s) => ({
      name: s.name,
      price: Number(s.price) || 0,
      duration_minutes: Number(s.duration_minutes) || 30,
      description: s.description || '',
    }));

    return json(res, 200, { barbers, services });
  } catch (error) {
    return json(res, 500, { error: error.message || 'public-config error' });
  }
}
