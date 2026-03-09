export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const accessToken = await getAccessToken();
    const DAYS_AHEAD = 14;
    const SLOT_DURATION = parseInt(process.env.SLOT_DURATION_MINS || '30');
    const WORK_START = parseInt(process.env.WORK_START_HOUR || '9');
    const WORK_END = parseInt(process.env.WORK_END_HOUR || '18');
    const TIMEZONE = process.env.TIMEZONE || 'Asia/Jerusalem';
    const CALENDAR_ID = process.env.CALENDAR_ID || 'primary';

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
    const days = [];

    for (let i = 0; i < DAYS_AHEAD; i++) {
      const dateObj = new Date(todayStr + 'T00:00:00');
      dateObj.setDate(dateObj.getDate() + i);
      const dateStr = dateObj.toLocaleDateString('en-CA', { timeZone: TIMEZONE }).slice(0, 10);

      const jsDay = new Date(dateStr + 'T12:00:00').getDay();
      if (jsDay === 0 || jsDay === 6) continue;

      const slotStart = new Date(`${dateStr}T${String(WORK_START).padStart(2,'0')}:00:00`);
      const slotEnd = new Date(`${dateStr}T${String(WORK_END).padStart(2,'0')}:00:00`);

      const timeMin = new Date(`${dateStr}T${String(WORK_START).padStart(2,'0')}:00:00`).toLocaleString('sv-SE', { timeZone: TIMEZONE }).replace(' ', 'T') + ':00';
      const timeMax = new Date(`${dateStr}T${String(WORK_END).padStart(2,'0')}:00:00`).toLocaleString('sv-SE', { timeZone: TIMEZONE }).replace(' ', 'T') + ':00';

      const freebusyResp = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeMin: new Date(timeMin).toISOString(),
          timeMax: new Date(timeMax).toISOString(),
          timeZone: TIMEZONE,
          items: [{ id: CALENDAR_ID }],
        }),
      });

      const freebusyData = await freebusyResp.json();
      const busy = freebusyData.calendars?.[CALENDAR_ID]?.busy || [];

      const daySlots = [];
      let cur = new Date(`${dateStr}T${String(WORK_START).padStart(2,'0')}:00:00`);
      const end = new Date(`${dateStr}T${String(WORK_END).padStart(2,'0')}:00:00`);

      while (cur < end) {
        const slotEnd = new Date(cur.getTime() + SLOT_DURATION * 60000);
        if (slotEnd > end) break;

        const curISO = cur.toLocaleString('sv-SE', { timeZone: TIMEZONE }).replace(' ', 'T');
        const endISO = slotEnd.toLocaleString('sv-SE', { timeZone: TIMEZONE }).replace(' ', 'T');

        const isBusy = busy.some((b) => new Date(b.start) < slotEnd && new Date(b.end) > cur);
        if (!isBusy) daySlots.push({
          start: new Date(curISO).toISOString(),
          end: new Date(endISO).toISOString(),
        });
        cur = slotEnd;
      }

      if (daySlots.length > 0) days.push({ date: dateStr, slots: daySlots });
    }

    return res.status(200).json({ days, timezone: TIMEZONE });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

async function getAccessToken() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error('Failed to get access token');
  return data.access_token;
}
