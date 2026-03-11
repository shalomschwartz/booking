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
    const event = {
      summary: `Meeting consultation with ${name}`,
      description: [`Client: ${name}`, `Email: ${email}`, notes ? `Notes: ${notes}` : null].filter(Boolean).join('\n'),
      start: { dateTime: start, timeZone: TIMEZONE },
      end: { dateTime: end, timeZone: TIMEZONE },
      attendees: [{ email, displayName: name }],
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
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
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?sendUpdates=all&conferenceDataVersion=1`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }
    );

    if (!calResp.ok) return res.status(500).json({ error: 'Failed to create event' });
    const created = await calResp.json();
    const meetLink = created.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri || null;

    // Save booking to Supabase
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ name, email, notes: notes || null, start_time: start, end_time: end, meet_link: meetLink, event_id: created.id }),
      });
    }

    await sendConfirmationEmail({ name, email, start, end, meetLink, slotDuration: parseInt(process.env.SLOT_DURATION_MINS || '30'), businessName: process.env.BUSINESS_NAME || 'Shalom AI Solutions' });

    return res.status(200).json({ success: true, eventId: created.id, meetLink });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

async function sendConfirmationEmail({ name, email, start, end, meetLink, slotDuration, businessName }) {
  const tz = process.env.TIMEZONE || 'Asia/Jerusalem';
  const accent = '#4F46E5';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dateStr = startDate.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = `${startDate.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })} - ${endDate.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Booking Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${accent};border-radius:10px;padding:10px 14px;">
                    <span style="color:#fff;font-size:15px;font-weight:600;letter-spacing:-0.2px;">${businessName}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;box-shadow:0 2px 24px rgba(0,0,0,0.07);overflow:hidden;">

              <!-- Top accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${accent};height:4px;"></td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0" style="padding:44px 44px 36px;">
                <tr>
                  <td>

                    <!-- Checkmark -->
                    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background:${accent};border-radius:50%;width:56px;height:56px;text-align:center;vertical-align:middle;">
                          <span style="color:#fff;font-size:26px;line-height:56px;">✓</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Title -->
                    <p style="margin:0 0 6px;font-size:26px;font-weight:700;color:${accent};letter-spacing:-0.5px;">You're booked!</p>
                    <p style="margin:0 0 36px;font-size:15px;color:#6B7280;line-height:1.6;">
                      Hi <strong style="color:${accent};">${name}</strong>, your appointment with ${businessName} has been confirmed.
                    </p>

                    <!-- Details box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;margin-bottom:32px;">
                      <tr>
                        <td style="background:#F3F4F6;padding:12px 22px;">
                          <span style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Appointment Details</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 22px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:14px 0;border-bottom:1px solid #E5E7EB;">
                                <span style="font-size:13px;color:#6B7280;font-weight:500;">Date</span><br/>
                                <span style="font-size:15px;color:${accent};font-weight:600;">${dateStr}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:14px 0;border-bottom:1px solid #E5E7EB;">
                                <span style="font-size:13px;color:#6B7280;font-weight:500;">Time</span><br/>
                                <span style="font-size:15px;color:${accent};font-weight:600;">${timeStr} (${slotDuration} min)</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:14px 0;border-bottom:1px solid #E5E7EB;">
                                <span style="font-size:13px;color:#6B7280;font-weight:500;">Name</span><br/>
                                <span style="font-size:15px;color:${accent};font-weight:600;">${name}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:14px 0;${meetLink ? 'border-bottom:1px solid #E5E7EB;' : ''}">
                                <span style="font-size:13px;color:#6B7280;font-weight:500;">Format</span><br/>
                                <span style="font-size:15px;color:${accent};font-weight:600;">Video call via Google Meet</span>
                              </td>
                            </tr>
                            ${meetLink ? `
                            <tr>
                              <td style="padding:14px 0;">
                                <span style="font-size:13px;color:#6B7280;font-weight:500;">Meeting link</span><br/>
                                <a href="${meetLink}" style="font-size:15px;color:${accent};font-weight:600;text-decoration:underline;">${meetLink}</a>
                              </td>
                            </tr>` : ''}
                          </table>
                        </td>
                      </tr>
                    </table>

                    ${meetLink ? `
                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                      <tr>
                        <td style="background:${accent};border-radius:10px;">
                          <a href="${meetLink}" style="display:inline-block;padding:14px 28px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.1px;">
                            Join Google Meet →
                          </a>
                        </td>
                      </tr>
                    </table>` : ''}

                    <!-- Note -->
                    <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;">
                      A calendar invitation has also been sent to your email. If you need to reschedule or have any questions, please reach out directly.
                    </p>

                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #F3F4F6;padding:20px 44px;">
                <tr>
                  <td>
                    <p style="margin:0;font-size:12px;color:#9CA3AF;">
                      © ${new Date().getFullYear()} ${businessName} · This is an automated confirmation email.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const accessToken = await getAccessToken();
  const rawMessage = [
    `To: ${email}`,
    `Subject: Booking confirmed - ${dateStr}`,
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
