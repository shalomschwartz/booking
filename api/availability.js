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

    const days = [];

    for (let i = 0; i < DAYS_AHEAD; i++) {
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + i);
      const dateStr = dateObj.toLocaleDateString('en-CA', { timeZone: TIMEZONE });

      const jsDay = new Date(dateStr + 'T12:00:00').getDay();
      if (jsDay === 0 || jsDay === 6) continue;

      const toUTC = (localDateStr, hour) => {
        const d = new Date(`${localDateStr}T${String(hour).padStart(2,'0')}:00:00`);
        const tzOffset = new Date(d.toLocaleString('en-US', { timeZone: TIMEZONE })).getTime() - new Date(d.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
        return new Date(d.getTime() - tzOffset);
      };

      const startUTC = toUTC(dateStr, WORK_START);
      const endUTC = toUTC(dateStr, WORK_END);

      const freebusyResp = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeMin: startUTC.toISOString(),
          timeMax: endUTC.toISOString(),
          timeZone: TIMEZONE,
          items: [{ id: CALENDAR_ID }],
        }),
      });

      const freebusyData = await freebusyResp.json();
      const busy = freebusyData.calendars?.[CALENDAR_ID]?.busy || [];

      const daySlots = [];
      let cur = new Date(startUTC);

      while (cur < endUTC) {
        const slotEnd = new Date(cur.getTime() + SLOT_DURATION * 60000);
        if (slotEnd > endUTC) break;
        const isBusy = busy.some((b) => new Date(b.start) < slotEnd && new Date(b.end) > cur);
        if (!isBusy) daySlots.push({ start: cur.toISOString(), end: slotEnd.toISOString() });
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
