const accent = '#4F46E5';

export default async function handler(req, res) {
  const { eventId } = req.query;
  if (!eventId) return res.status(400).send('Missing event ID');

  // GET — show confirmation page
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Cancel Appointment</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { background: #F3F4F6; font-family: 'Inter', Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
    .card { background: #fff; border-radius: 20px; box-shadow: 0 2px 24px rgba(0,0,0,0.07); max-width: 440px; width: 100%; overflow: hidden; }
    .top-bar { background: ${accent}; height: 4px; }
    .body { padding: 44px 44px 40px; text-align: center; }
    .icon { width: 64px; height: 64px; border-radius: 50%; background: #FEF2F2; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
    h1 { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 12px; }
    p { font-size: 15px; color: #6B7280; line-height: 1.6; margin-bottom: 32px; }
    .btn-cancel { display: block; width: 100%; padding: 14px; background: #DC2626; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; margin-bottom: 12px; }
    .btn-cancel:hover { background: #B91C1C; }
    .btn-keep { display: block; width: 100%; padding: 14px; background: transparent; color: #374151; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; text-decoration: none; }
    .btn-keep:hover { background: #F9FAFB; }
  </style>
</head>
<body>
  <div class="card">
    <div class="top-bar"></div>
    <div class="body">
      <div class="icon">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M7 7l14 14M21 7L7 21" stroke="#DC2626" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <h1>Cancel your appointment?</h1>
      <p>This will permanently remove the appointment from your calendar. This action cannot be undone.</p>
      <form method="POST" action="/api/cancel?eventId=${eventId}">
        <button type="submit" class="btn-cancel">Yes, cancel my appointment</button>
      </form>
      <a href="javascript:history.back()" class="btn-keep">No, keep my appointment</a>
    </div>
  </div>
</body>
</html>`);
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

      if (!resp.ok && resp.status !== 410) {
        throw new Error('Failed to delete event');
      }

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Appointment Cancelled</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #F3F4F6; font-family: 'Inter', Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
    .card { background: #fff; border-radius: 20px; box-shadow: 0 2px 24px rgba(0,0,0,0.07); max-width: 440px; width: 100%; overflow: hidden; }
    .top-bar { background: #6B7280; height: 4px; }
    .body { padding: 44px 44px 40px; text-align: center; }
    .icon { width: 64px; height: 64px; border-radius: 50%; background: #F3F4F6; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
    h1 { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 12px; }
    p { font-size: 15px; color: #6B7280; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="top-bar"></div>
    <div class="body">
      <div class="icon">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M7 14l5 5L21 9" stroke="#6B7280" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h1>Appointment cancelled</h1>
      <p>Your appointment has been cancelled and removed from the calendar. You won't receive any further reminders.</p>
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
