export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, email, notes, start, end } = req.body;
    if (!name || !email || !start || !end) return res.status(400).json({ error: 'Missing required fields' });

    const accessToken = await getAccessToken();
    const TIMEZONE = process.env.TIMEZONE || 'Asia/Jerusalem';
    const CALENDAR_ID = process.env.CALENDAR_ID || 'primary';
    const OWNER_NAME = process.env.OWNER_NAME || 'Your Name';

    const event = {
      summary: `Appointment with ${OWNER_NAME}`,
      description: [`Client: ${name}`, `Email: ${email}`, notes ? `Notes: ${notes}` : null].filter(Boolean).join('\n'),
      start: { dateTime: start, timeZone: TIMEZONE },
      end: { dateTime: end, timeZone: TIMEZONE },
      attendees: [{ email, displayName: name }],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 1440 },
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const calResp = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?sendUpdates=all`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }
    );

    if (!calResp.ok) return res.status(500).json({ error: 'Failed to create event' });
    const created = await calResp.json();
    return res.status(200).json({ success: true, eventId: created.id });
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
