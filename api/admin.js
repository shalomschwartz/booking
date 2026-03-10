export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  // POST /api/admin — login with email + password
  if (req.method === 'POST') {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      return res.status(401).json({ error: data.error_description || data.msg || 'Invalid credentials' });
    }
    return res.status(200).json({ access_token: data.access_token, user: { email: data.user?.email, id: data.user?.id } });
  }

  // GET /api/admin — fetch bookings (requires valid session token)
  if (req.method === 'GET') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.slice(7);

    // Verify the token is valid by calling Supabase auth
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!userResp.ok) return res.status(401).json({ error: 'Invalid or expired session' });

    // Fetch bookings with service key
    const bookingsResp = await fetch(`${SUPABASE_URL}/rest/v1/bookings?order=start_time.desc&limit=500`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    if (!bookingsResp.ok) {
      return res.status(500).json({ error: 'Failed to fetch bookings' });
    }
    const bookings = await bookingsResp.json();
    return res.status(200).json(bookings);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
