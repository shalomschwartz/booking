export default async function handler(req, res) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  const baseUrl = `https://${req.headers.host}`;

  if (!req.query.code) {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${baseUrl}/api/auth`,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
    });
    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: `${baseUrl}/api/auth`,
      code: req.query.code,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenResp.json();
  if (!tokens.refresh_token) {
    return res.status(400).send(`<h2>No refresh token. <a href="/api/auth">Try again</a></h2>`);
  }

  return res.status(200).send(`
    <!DOCTYPE html><html><head><title>Setup Complete</title>
    <style>
      body{font-family:sans-serif;max-width:600px;margin:60px auto;padding:0 20px}
      .token{background:#f4f4f4;border:1px solid #ddd;border-radius:8px;padding:16px;word-break:break-all;font-family:monospace;font-size:13px}
      .step{background:#e8f5e9;border-left:4px solid #4caf50;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0}
    </style>
    </head><body>
    <h1>✅ Almost done!</h1>
    <p>Copy this refresh token into your Vercel environment variables:</p>
    <div class="token">${tokens.refresh_token}</div>
    <div class="step">
      <strong>Next steps:</strong><br><br>
      1. Go to <a href="https://vercel.com" target="_blank">Vercel</a> → your project → Settings → Environment Variables<br>
      2. Add: <code>GOOGLE_REFRESH_TOKEN</code> = (paste token above)<br>
      3. Save and <strong>Redeploy</strong><br>
      4. Your booking page is live 24/7! 🎉
    </div>
    </body></html>
  `);
}
