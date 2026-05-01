# Coliseum Finanzas

App de caja, agenda e historico para Coliseum la Barberia.

## Variables de entorno de Vercel

Frontend:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_AGENDA_REFRESH_MINUTES=15
```

Google Calendar backend:

```text
GOOGLE_CALENDAR_ID
GOOGLE_CALENDAR_IDS
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
GOOGLE_CALENDAR_TIMEZONE=Europe/Madrid
GOOGLE_CALENDAR_DEFAULT_DURATION_MINUTES=45
```

Usa `GOOGLE_CALENDAR_ID` para un calendario unico o `GOOGLE_CALENDAR_IDS` para varios calendarios por peluquero.

Calendarios actuales:

```text
GOOGLE_CALENDAR_IDS=Adrian=92ffdcfd689a16966f6d7b985b60672a1da884f0a214fcfa2988b6e297463290@group.calendar.google.com,Jorge=4641a98afac0da07d86e033adda6de8e04591eeffb87c2d544e705ee49804c8b@group.calendar.google.com,Saad=11bb47a1792086a31a1c6991c2421079385ab55307042ba8bb4f96a1215fa5a9@group.calendar.google.com
```

## Integracion con Google Calendar

1. Crea un calendario especifico para la barberia, por ejemplo `Coliseum Citas`.
2. En Google Cloud, crea una service account con acceso a Calendar API.
3. Comparte el calendario `Coliseum Citas` con el email de la service account.
4. Dale permiso para hacer cambios en eventos.
5. En Vercel, configura las variables `GOOGLE_*`.

Con varios calendarios, el peluquero se detecta por el calendario. Los eventos se leen con este formato recomendado:

```text
Corte · Nombre cliente
```

La app tambien escribe eventos con ese formato cuando se crea una cita desde Agenda.
