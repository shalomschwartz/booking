const accent = '#4F46E5';
const tz = process.env.TIMEZONE || 'Asia/Jerusalem';

const sharedStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  body { background: #F3F4F6; font-family: 'Inter', Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
  .card { background: #fff; border-radius: 20px; box-shadow: 0 2px 24px rgba(0,0,0,0.07); max-width: 480px; width: 100%; overflow: hidden; }
  .top-bar { height: 4px; }
  .body { padding: 44px 44px 40px; text-align: center; }
  .icon { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
  h1 { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 10px; }
  .sub { font-size: 15px; color: #6B7280; line-height: 1.6; margin-bottom: 28px; }
  .details-box { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden; margin-bottom: 28px; text-align: left; }
  .details-header { background: #F3F4F6; padding: 10px 20px; font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; }
  .details-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 1px solid #E5E7EB; }
  .details-row:last-child { border-bottom: none; }
  .details-label { font-size: 13px; color: #6B7280; font-weight: 500; }
  .details-val { font-size: 14px; color: ${accent}; font-weight: 600; text-align: right; max-width: 60%; }
  .btn-cancel { display: block; width: 100%; padding: 14px; background: #DC2626; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; margin-bottom: 12px; }
  .btn-cancel:hover { background: #B91C1C; }
  .btn-reschedule { display: block; width: 100%; padding: 14px; background: transparent; color: ${accent}; border: 1.5px solid ${accent}; border-radius: 10px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; text-decoration: none; text-align: center; margin-bottom: 12px; }
  .btn-reschedule:hover { background: #EEF2FF; }
  .btn-keep { display: block; width: 100%; padding: 14px; background: transparent; color: #374151; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; text-decoration: none; text-align: center; }
  .btn-keep:hover { background: #F9FAFB; }
`;

function fmtEvent(event) {
  const start = new Date(event.start?.dateTime || event.start?.date);
  const end = new Date(event.end?.dateTime || event.end?.date);
  const dateStr = start.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = `${start.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })} – ${end.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })}`;
  const nameMatch = event.description?.match(/^Client: (.+)/m);
  const clientName = nameMatch?.[1] || (event.attendees?.[0]?.displayName) || '';
  const rescheduleMatch = event.description?.match(/^Reschedule: (.+)/m);
  const rescheduleUrl = rescheduleMatch?.[1]?.trim() || null;
  return { dateStr, timeStr, clientName, rescheduleUrl };
}

function detailsHtml(dateStr, timeStr, clientName) {
  return `
    <div class="details-box">
      <div class="details-header">Appointment Details</div>
      <div class="details-row"><span class="details-label">Date</span><span class="details-val">${dateStr}</span></div>
      <div class="details-row"><span class="details-label">Time</span><span class="details-val">${timeStr}</span></div>
      ${clientName ? `<div class="details-row"><span class="details-label">Name</span><span class="details-val">${clientName}</span></div>` : ''}
    </div>`;
}

export default async function handler(req, res) {
  const { eventId, keep } = req.query;
  if (!eventId) return res.status(400).send('Missing event ID');

  // GET ?keep=1 — "glad you're staying" page
  if (req.method === 'GET' && keep === '1') {
    try {
      const accessToken = await getAccessToken();
      const CALENDAR_ID = process.env.CALENDAR_ID || 'primary';
      const evResp = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const event = evResp.ok ? await evResp.json() : null;
      const { dateStr, timeStr, clientName } = event ? fmtEvent(event) : { dateStr: '', timeStr: '', clientName: '' };

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>See You Soon</title>
  <style>${sharedStyles}</style>
</head>
<body>
  <div class="card">
    <div class="top-bar" style="background:${accent};"></div>
    <div class="body">
      <div class="icon" style="background:#EEF2FF;">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <path d="M7 15l6 6L23 9" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h1>Great, we'll see you soon!</h1>
      <p class="sub">Your appointment is confirmed. We're looking forward to seeing you${clientName ? ', ' + clientName : ''}.</p>
      ${dateStr ? detailsHtml(dateStr, timeStr, '') : ''}
    </div>
  </div>
</body>
</html>`);
    } catch (err) {
      console.error(err);
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>${sharedStyles}</style></head><body><div class="card"><div class="top-bar" style="background:${accent};"></div><div class="body"><h1>Great, we'll see you soon!</h1><p class="sub">Your appointment is still confirmed.</p></div></div></body></html>`);
    }
  }

  // GET — show cancellation confirmation with event details
  if (req.method === 'GET') {
    try {
      const accessToken = await getAccessToken();
      const CALENDAR_ID = process.env.CALENDAR_ID || 'primary';
      const evResp = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const event = evResp.ok ? await evResp.json() : null;
      const { dateStr, timeStr, clientName, rescheduleUrl } = event ? fmtEvent(event) : { dateStr: '', timeStr: '', clientName: '', rescheduleUrl: null };
      const keepUrl = `/api/cancel?eventId=${eventId}&keep=1`;

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Cancel Appointment</title>
  <style>${sharedStyles}</style>
</head>
<body>
  <div class="card">
    <div class="top-bar" style="background:#DC2626;"></div>
    <div class="body">
      <div class="icon" style="background:#FEF2F2;">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M7 7l14 14M21 7L7 21" stroke="#DC2626" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <h1>Cancel your appointment?</h1>
      <p class="sub">This will permanently remove the appointment from your calendar and cannot be undone.</p>
      ${dateStr ? detailsHtml(dateStr, timeStr, clientName) : ''}
      <form method="POST" action="/api/cancel?eventId=${eventId}">
        <button type="submit" class="btn-cancel">Yes, cancel my appointment</button>
      </form>
      ${rescheduleUrl ? `<a href="${rescheduleUrl}" class="btn-reschedule">Reschedule instead →</a>` : ''}
      <a href="${keepUrl}" class="btn-keep">No, keep my appointment</a>
    </div>
  </div>
</body>
</html>`);
    } catch (err) {
      console.error(err);
      // Fallback without details
      const keepUrl = `/api/cancel?eventId=${eventId}&keep=1`;
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Cancel Appointment</title><style>${sharedStyles}</style></head>
<body><div class="card"><div class="top-bar" style="background:#DC2626;"></div><div class="body">
  <div class="icon" style="background:#FEF2F2;"><svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M7 7l14 14M21 7L7 21" stroke="#DC2626" stroke-width="2.5" stroke-linecap="round"/></svg></div>
  <h1>Cancel your appointment?</h1>
  <p class="sub">This will permanently remove the appointment from your calendar and cannot be undone.</p>
  <form method="POST" action="/api/cancel?eventId=${eventId}"><button type="submit" class="btn-cancel">Yes, cancel my appointment</button></form>
  <a href="${keepUrl}" class="btn-keep">No, keep my appointment</a>
</div></div></body></html>`);
    }
  }

  // POST — delete the event
  if (req.method === 'POST') {
    try {
      const accessToken = await getAccessToken();
      const CALENDAR_ID = process.env.CALENDAR_ID || 'primary';
      const resp = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}?sendUpdates=all`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!resp.ok && resp.status !== 410) throw new Error('Failed to delete event');

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Appointment Cancelled</title>
  <style>${sharedStyles}</style>
</head>
<body>
  <div class="card">
    <div class="top-bar" style="background:#6B7280;"></div>
    <div class="body">
      <div class="icon" style="background:#F3F4F6;">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M7 14l5 5L21 9" stroke="#6B7280" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h1>Appointment cancelled</h1>
      <p class="sub" style="margin-bottom:0;">Your appointment has been cancelled and removed from the calendar. You won't receive any further reminders.</p>
    </div>
  </div>
</body>
</html>`);
    } catch (err) {
      console.error(err);
      return res.status(500).send('Something went wrong. Please try again.');
    }
  }

  return res.status(405).send('Method not allowed');
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
