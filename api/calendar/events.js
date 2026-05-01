import crypto from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_BASE_URL = 'https://www.googleapis.com/calendar/v3/calendars';
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function getPrivateKey() {
  return (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
}

function hasGoogleConfig() {
  return Boolean(
    (process.env.GOOGLE_CALENDAR_ID || process.env.GOOGLE_CALENDAR_IDS) &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  );
}

function extractCalendarId(value = '') {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    return decodeURIComponent(url.searchParams.get('src') || trimmed);
  } catch {
    return decodeURIComponent(trimmed);
  }
}

function getCalendars() {
  const multi = process.env.GOOGLE_CALENDAR_IDS;
  if (multi) {
    return multi
      .split(',')
      .map((entry) => {
        const [name, ...idParts] = entry.split('=');
        return { name: name.trim(), id: extractCalendarId(idParts.join('=')) };
      })
      .filter((calendar) => calendar.name && calendar.id);
  }
  return [{ name: '', id: extractCalendarId(process.env.GOOGLE_CALENDAR_ID) }];
}

function encodeGoogleId(calendarId, eventId) {
  return `google:${encodeURIComponent(calendarId)}:${eventId}`;
}

function decodeGoogleId(value = '') {
  const raw = value.replace(/^google:/, '');
  const [maybeCalendar, ...eventParts] = raw.split(':');
  if (!eventParts.length) {
    const fallback = getCalendars()[0];
    return { calendarId: fallback?.id, eventId: maybeCalendar };
  }
  return { calendarId: decodeURIComponent(maybeCalendar), eventId: eventParts.join(':') };
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: SCOPES.join(' '),
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(getPrivateKey());
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Google auth failed');
  return data.access_token;
}

function dayBounds(date) {
  const timezone = process.env.GOOGLE_CALENDAR_TIMEZONE || 'Europe/Madrid';
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { timeMin: start.toISOString(), timeMax: end.toISOString(), timezone };
}

function parseSummary(summary = '', fallbackBarber = '') {
  const parts = summary
    .split(/\s+[·|-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (fallbackBarber) {
    return {
      barberName: fallbackBarber,
      serviceName: parts[0] || summary || '',
      client: parts.slice(1).join(' · ') || null,
    };
  }
  return {
    barberName: parts[0] || '',
    serviceName: parts[1] || summary || '',
    client: parts.slice(2).join(' · ') || null,
  };
}

function eventToAppointment(event, calendar) {
  const start = event.start?.dateTime || `${event.start?.date}T00:00:00`;
  const d = new Date(start);
  const parsed = parseSummary(event.summary, calendar.name);
  const privateProps = event.extendedProperties?.private || {};
  return {
    id: encodeGoogleId(calendar.id, event.id),
    google_event_id: event.id,
    google_calendar_id: calendar.id,
    summary: event.summary || '',
    description: event.description || '',
    barber_name: privateProps.barber || calendar.name || parsed.barberName,
    service_name: privateProps.service || parsed.serviceName,
    client: privateProps.client || parsed.client,
    status: event.status === 'cancelled' ? 'cancelled' : privateProps.coliseumStatus || 'pending',
    appt_date: start.slice(0, 10),
    appt_time: d.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: process.env.GOOGLE_CALENDAR_TIMEZONE || 'Europe/Madrid',
    }),
    start,
    end: event.end?.dateTime || null,
  };
}

async function googleRequest(calendarId, path, options = {}) {
  const token = await getAccessToken();
  const encodedCalendarId = encodeURIComponent(calendarId);
  const response = await fetch(`${CALENDAR_BASE_URL}/${encodedCalendarId}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Google Calendar request failed (${calendarId})`);
  return data;
}

async function listEvents(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  if (url.searchParams.get('debug') === '1') {
    return json(res, 200, {
      configured: hasGoogleConfig(),
      calendars: getCalendars().map((calendar) => ({ name: calendar.name, id: calendar.id })),
      serviceAccountEmailSet: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
      privateKeyLooksValid: getPrivateKey().includes('BEGIN PRIVATE KEY'),
    });
  }
  const date = url.searchParams.get('date');
  if (!date) return json(res, 400, { error: 'Missing date' });

  const { timeMin, timeMax, timezone } = dayBounds(date);
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin,
    timeMax,
    timeZone: timezone,
    showDeleted: 'false',
  });
  const calendars = getCalendars();
  const results = await Promise.all(
    calendars.map(async (calendar) => {
      try {
        const data = await googleRequest(calendar.id, `/events?${params.toString()}`);
        return {
          calendar,
          events: (data.items || []).map((event) => eventToAppointment(event, calendar)),
          error: null,
        };
      } catch (error) {
        return {
          calendar,
          events: [],
          error: error.message || 'Calendar request failed',
        };
      }
    }),
  );
  const events = results.flatMap((result) => result.events)
    .sort((a, b) => `${a.appt_date} ${a.appt_time}`.localeCompare(`${b.appt_date} ${b.appt_time}`));
  const errors = results
    .filter((result) => result.error)
    .map((result) => ({ name: result.calendar.name, id: result.calendar.id, error: result.error }));
  return json(res, 200, { events, errors });
}

async function createEvent(req, res) {
  const body = await readBody(req);
  const timezone = process.env.GOOGLE_CALENDAR_TIMEZONE || 'Europe/Madrid';
  const duration = Number(process.env.GOOGLE_CALENDAR_DEFAULT_DURATION_MINUTES || 45);
  const calendar = getCalendars().find((item) => item.name.toLowerCase() === String(body.barber_name || '').toLowerCase()) || getCalendars()[0];
  if (!calendar) return json(res, 400, { error: 'No calendar configured' });
  const start = new Date(`${body.appt_date}T${body.appt_time}`);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + duration);
  const summary = [body.service_name, body.client].filter(Boolean).join(' · ');

  const data = await googleRequest(calendar.id, '/events', {
    method: 'POST',
    body: JSON.stringify({
      summary,
      description: 'Creado desde Coliseum Finanzas',
      start: { dateTime: start.toISOString(), timeZone: timezone },
      end: { dateTime: end.toISOString(), timeZone: timezone },
      extendedProperties: {
        private: {
          barber: body.barber_name || '',
          service: body.service_name || '',
          client: body.client || '',
          coliseumStatus: 'pending',
        },
      },
    }),
  });
  return json(res, 201, { event: eventToAppointment(data, calendar) });
}

async function updateEvent(req, res) {
  const body = await readBody(req);
  const { calendarId, eventId } = decodeGoogleId(body.event_id || '');
  if (!calendarId || !eventId) return json(res, 400, { error: 'Missing event_id' });
  const calendar = getCalendars().find((item) => item.id === calendarId) || { id: calendarId, name: '' };

  const existing = await googleRequest(calendarId, `/events/${encodeURIComponent(eventId)}`);
  const privateProps = existing.extendedProperties?.private || {};
  const nextStatus = body.action === 'done' ? 'done' : body.action === 'cancel' ? 'cancelled' : privateProps.coliseumStatus;
  const descriptionNote = body.action === 'done'
    ? `\n\nCobrado en Coliseum Finanzas${body.ticket_id ? ` · Ticket ${body.ticket_id}` : ''}`
    : '';

  const data = await googleRequest(calendarId, `/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      description: `${existing.description || ''}${descriptionNote}`,
      extendedProperties: {
        private: {
          ...privateProps,
          coliseumStatus: nextStatus,
          ticketId: body.ticket_id || privateProps.ticketId || '',
        },
      },
    }),
  });
  return json(res, 200, { event: eventToAppointment(data, calendar) });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  try {
    if (!hasGoogleConfig()) {
      return json(res, 501, { error: 'Google Calendar is not configured' });
    }
    if (req.method === 'GET') return listEvents(req, res);
    if (req.method === 'POST') return createEvent(req, res);
    if (req.method === 'PATCH') return updateEvent(req, res);
    return json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Calendar API error' });
  }
}
