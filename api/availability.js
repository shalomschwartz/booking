export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const accessToken = await getAccessToken();
    const DAYS_AHEAD = 14;
    const SLOT_DURATION = parseInt(process.env.SLOT_DURATION_MINS || '60');
    const WORK_START = parseInt(process.env.WORK_START_HOUR || '9');
    const WORK_END = parseInt(process.env.WORK_END_HOUR || '18');
    const TIMEZONE = process.env.TIMEZONE || 'Asia/Jerusalem';
    const CALENDAR_ID = process.env.CALENDAR_ID || 'primary';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + DAYS_AHEAD);
    endDate.setHours(23, 59, 59, 999);

    const freebusyResp = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeMin: today.toISOString(),
        timeMax: endDate.toISOString(),
        timeZone: TIMEZONE,
        items: [{ id: CALENDAR_ID }],
      }),
    });

    const freebusyData = await freebusyResp.json();
    const busy = freebusyData.calendars?.[CALENDAR_ID]?.busy || [];

    const days = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const daySlots = [];
      const dayStart = new Date(date); dayStart.setHours(WORK_START, 0, 0, 0);
      const dayEnd = new Date(date); dayEnd.setHours(WORK_END, 0, 0, 0);
      let cur = new Date(dayStart);

      while (cur < dayEnd) {
        const end = new Date(cur.getTime() + SLOT_DURATION * 60000);
        if (end > dayEnd) break;
        const isBusy = busy.some((b) => new Date(b.start) < end && new Date(b.end) > cur);
        if (!isBusy) daySlots.push({ start: cur.toISOString(), end: end.toISOString() });
        cur = end;
      }

      if (daySlots.length > 0) days.push({ date: date.toISOString().split('T')[0], slots: daySlots });
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
