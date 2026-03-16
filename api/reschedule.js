export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { eventId, name, email, notes, start, end, meetingType } = req.body;
    if (!eventId || !start || !end) return res.status(400).json({ error: 'Missing required fields' });

    const accessToken = await getAccessToken();
    const TIMEZONE = process.env.TIMEZONE || 'Asia/Jerusalem';
    const CALENDAR_ID = process.env.CALENDAR_ID || 'primary';

    // Fetch existing event to preserve fields we're not changing
    const existingResp = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!existingResp.ok) return res.status(404).json({ error: 'Event not found' });
    const existing = await existingResp.json();

    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const proto = host.includes('localhost') ? 'http' : 'https';
    const cancelUrl = `${proto}://${host}/api/cancel?eventId=${eventId}`;
    const resolvedEmail = email || existing.attendees?.[0]?.email || '';
    const resolvedName = name || '';
    const rescheduleUrl = `${proto}://${host}?reschedule=${eventId}&name=${encodeURIComponent(resolvedName)}&email=${encodeURIComponent(resolvedEmail)}`;

    const useZoom = meetingType === 'zoom';
    let zoomLink = null;
    if (useZoom) {
      const duration = Math.round((new Date(end) - new Date(start)) / 60000);
      zoomLink = await createZoomMeeting({ topic: `Meeting consultation with ${resolvedName}`, start, duration, timezone: TIMEZONE });
    }

    // Patch the event with new time (and optionally updated name/notes)
    const updatedDescription = [
      `Client: ${resolvedName}`,
      `Email: ${resolvedEmail}`,
      notes ? `Notes: ${notes}` : null,
      '',
      `Reschedule: ${rescheduleUrl}`,
      '',
      `Cancel: ${cancelUrl}`,
    ].filter(v => v !== null).join('\n');

    const patch = {
      start: { dateTime: start, timeZone: TIMEZONE },
      end: { dateTime: end, timeZone: TIMEZONE },
      summary: resolvedName ? `Meeting consultation with ${resolvedName}` : existing.summary,
      description: updatedDescription,
      ...(useZoom ? { location: zoomLink } : {}),
    };
    if (email) {
      patch.attendees = [{ email, displayName: name || '' }];
    }

    const updateResp = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}?sendUpdates=all`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }
    );

    if (!updateResp.ok) return res.status(500).json({ error: 'Failed to update event' });
    const updated = await updateResp.json();

    // Send updated confirmation email
    const calendarLink = updated.htmlLink || null;

    await sendRescheduleEmail({
      name: resolvedName,
      email: resolvedEmail,
      notes,
      start,
      end,
      calendarLink,
      cancelUrl,
      rescheduleUrl,
      slotDuration: parseInt(process.env.SLOT_DURATION_MINS || '30'),
      businessName: process.env.BUSINESS_NAME || 'Shalom AI Solutions',
    });

    return res.status(200).json({ success: true, eventId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

async function sendRescheduleEmail({ name, email, notes, start, end, calendarLink, cancelUrl, rescheduleUrl, slotDuration, businessName }) {
  const tz = process.env.TIMEZONE || 'Asia/Jerusalem';
  const accent = '#4F46E5';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dateStr = startDate.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = `${startDate.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })} - ${endDate.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Appointment Rescheduled</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr>
          <td align="center" style="padding-bottom:28px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="background:${accent};border-radius:10px;padding:10px 14px;">
                <span style="color:#fff;font-size:15px;font-weight:600;">${businessName}</span>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;border-radius:20px;box-shadow:0 2px 24px rgba(0,0,0,0.07);overflow:hidden;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:${accent};height:4px;"></td></tr></table>
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:44px 44px 36px;">
              <tr><td>
                <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr>
                  <td style="background:#EEF2FF;border-radius:50%;width:56px;height:56px;text-align:center;vertical-align:middle;">
                    <span style="font-size:26px;line-height:56px;">📅</span>
                  </td>
                </tr></table>
                <p style="margin:0 0 6px;font-size:26px;font-weight:700;color:${accent};letter-spacing:-0.5px;">Appointment rescheduled!</p>
                <p style="margin:0 0 36px;font-size:15px;color:#6B7280;line-height:1.6;">
                  Hi <strong style="color:${accent};">${name}</strong>, your appointment with ${businessName} has been updated.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;margin-bottom:32px;">
                  <tr><td style="background:#F3F4F6;padding:12px 22px;">
                    <span style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Updated Appointment</span>
                  </td></tr>
                  <tr><td style="padding:0 22px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:14px 0;border-bottom:1px solid #E5E7EB;">
                        <span style="font-size:13px;color:#6B7280;font-weight:500;">Date</span><br/>
                        <span style="font-size:15px;color:${accent};font-weight:600;">${dateStr}</span>
                      </td></tr>
                      <tr><td style="padding:14px 0;border-bottom:1px solid #E5E7EB;">
                        <span style="font-size:13px;color:#6B7280;font-weight:500;">Time</span><br/>
                        <span style="font-size:15px;color:${accent};font-weight:600;">${timeStr} (${slotDuration} min)</span>
                      </td></tr>
                      <tr><td style="padding:14px 0;${notes ? 'border-bottom:1px solid #E5E7EB;' : ''}">
                        <span style="font-size:13px;color:#6B7280;font-weight:500;">Name</span><br/>
                        <span style="font-size:15px;color:${accent};font-weight:600;">${name}</span>
                      </td></tr>
                      ${notes ? `<tr><td style="padding:14px 0;">
                        <span style="font-size:13px;color:#6B7280;font-weight:500;">Notes</span><br/>
                        <span style="font-size:15px;color:${accent};font-weight:600;">${notes}</span>
                      </td></tr>` : ''}
                    </table>
                  </td></tr>
                </table>
                <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;"><tr>
                  ${calendarLink ? `<td style="padding-right:8px;"><table cellpadding="0" cellspacing="0"><tr>
                    <td style="background:${accent};border-radius:10px;">
                      <a href="${calendarLink}" style="display:inline-block;padding:13px 22px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;white-space:nowrap;">View in Calendar →</a>
                    </td>
                  </tr></table></td>` : ''}
                  <td><table cellpadding="0" cellspacing="0"><tr>
                    <td style="background:#fff;border:1.5px solid #E5E7EB;border-radius:10px;">
                      <a href="${cancelUrl}" style="display:inline-block;padding:13px 22px;color:#DC2626;font-size:14px;font-weight:600;text-decoration:none;white-space:nowrap;">Cancel appointment</a>
                    </td>
                  </tr></table></td>
                </tr></table>
                <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;">
                  An updated calendar invitation has been sent to your email.
                </p>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #F3F4F6;padding:20px 44px;"><tr>
              <td><p style="margin:0;font-size:12px;color:#9CA3AF;">© ${new Date().getFullYear()} ${businessName} · Automated confirmation.</p></td>
            </tr></table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const accessToken = await getAccessToken();
  const rawMessage = [
    `To: ${email}`,
    `Subject: Appointment rescheduled - ${dateStr}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
  ].join('\r\n');

  const encoded = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encoded }),
  });
}

async function getZoomAccessToken() {
  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
  const resp = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error('Failed to get Zoom access token');
  return data.access_token;
}

async function createZoomMeeting({ topic, start, duration, timezone }) {
  const token = await getZoomAccessToken();
  const resp = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      type: 2,
      start_time: new Date(start).toISOString().replace('.000', ''),
      duration,
      timezone,
      settings: { host_video: true, participant_video: true, join_before_host: true },
    }),
  });
  const data = await resp.json();
  if (!data.join_url) throw new Error('Failed to create Zoom meeting');
  return data.join_url;
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
