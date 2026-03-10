import { useState, useEffect } from "react";

const ACCENT = import.meta.env.VITE_ACCENT_COLOR || "#4F46E5";

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function Admin() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem("admin_session")); } catch { return null; }
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (session) loadBookings(session.access_token);
  }, [session]);

  async function login(e) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    try {
      const resp = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setLoginError(data.error || "Invalid credentials");
      } else {
        const sess = { access_token: data.access_token, user: data.user };
        localStorage.setItem("admin_session", JSON.stringify(sess));
        setSession(sess);
      }
    } catch {
      setLoginError("Network error. Please try again.");
    }
    setLoggingIn(false);
  }

  async function loadBookings(token) {
    setLoadingBookings(true);
    try {
      const resp = await fetch("/api/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.status === 401) { logout(); return; }
      const data = await resp.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch { setBookings([]); }
    setLoadingBookings(false);
  }

  function logout() {
    localStorage.removeItem("admin_session");
    setSession(null);
    setBookings([]);
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  function fmtTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  }

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase();
    return (
      (b.name || "").toLowerCase().includes(q) ||
      (b.email || "").toLowerCase().includes(q)
    );
  });

  const s = {
    page: {
      minHeight: "100vh",
      background: hexToRgba(ACCENT, 0.06),
      fontFamily: "'Inter', system-ui, sans-serif",
      paddingBottom: 60,
    },
    nav: {
      background: ACCENT,
      padding: "0 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: 56,
    },
    navTitle: { color: "#fff", fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" },
    navRight: { display: "flex", alignItems: "center", gap: 16 },
    logoutBtn: {
      background: "rgba(255,255,255,0.15)",
      border: "none",
      borderRadius: 8,
      color: "#fff",
      padding: "6px 14px",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
    },
    loginWrap: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: hexToRgba(ACCENT, 0.06),
    },
    loginCard: {
      background: "#fff",
      borderRadius: 20,
      padding: "44px 40px",
      width: "100%",
      maxWidth: 380,
      boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
    },
    loginTitle: { fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 6, letterSpacing: "-0.4px" },
    loginSub: { fontSize: 14, color: "#6B7280", marginBottom: 28 },
    label: { fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 },
    input: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 10,
      border: "1.5px solid #E5E7EB",
      fontSize: 14,
      outline: "none",
      boxSizing: "border-box",
      marginBottom: 16,
    },
    loginBtn: {
      width: "100%",
      padding: "12px",
      background: ACCENT,
      color: "#fff",
      border: "none",
      borderRadius: 10,
      fontSize: 15,
      fontWeight: 600,
      cursor: "pointer",
      marginTop: 4,
    },
    errorMsg: {
      background: "#FEF2F2",
      color: "#DC2626",
      borderRadius: 8,
      padding: "10px 14px",
      fontSize: 13,
      marginBottom: 16,
    },
    main: { maxWidth: 900, margin: "0 auto", padding: "32px 24px 0" },
    statsRow: { display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" },
    statCard: {
      background: "#fff",
      borderRadius: 14,
      padding: "20px 24px",
      flex: "1 1 160px",
      boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
    },
    statNum: { fontSize: 32, fontWeight: 700, color: ACCENT, letterSpacing: "-1px" },
    statLabel: { fontSize: 13, color: "#6B7280", marginTop: 2 },
    card: {
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
      overflow: "hidden",
    },
    cardHeader: {
      padding: "20px 24px",
      borderBottom: "1px solid #F3F4F6",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 12,
    },
    cardTitle: { fontSize: 16, fontWeight: 700, color: "#111827" },
    searchInput: {
      padding: "8px 14px",
      borderRadius: 8,
      border: "1.5px solid #E5E7EB",
      fontSize: 13,
      outline: "none",
      minWidth: 200,
    },
    table: { width: "100%", borderCollapse: "collapse" },
    th: {
      padding: "12px 20px",
      textAlign: "left",
      fontSize: 11,
      fontWeight: 700,
      color: "#6B7280",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      background: "#F9FAFB",
      borderBottom: "1px solid #F3F4F6",
    },
    td: {
      padding: "14px 20px",
      fontSize: 14,
      color: "#111827",
      borderBottom: "1px solid #F9FAFB",
      verticalAlign: "middle",
    },
    meetBtn: {
      background: hexToRgba(ACCENT, 0.1),
      color: ACCENT,
      border: "none",
      borderRadius: 6,
      padding: "4px 10px",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-block",
    },
    emptyRow: { padding: "40px 20px", textAlign: "center", color: "#9CA3AF", fontSize: 14 },
    refreshBtn: {
      background: hexToRgba(ACCENT, 0.1),
      color: ACCENT,
      border: "none",
      borderRadius: 8,
      padding: "7px 14px",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
    },
  };

  const businessName = import.meta.env.VITE_BUSINESS_NAME || "Admin";

  if (!session) {
    return (
      <div style={s.loginWrap}>
        <div style={s.loginCard}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "inline-block", background: ACCENT, borderRadius: 10, padding: "8px 14px", marginBottom: 20 }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{businessName}</span>
            </div>
            <div style={s.loginTitle}>Admin Dashboard</div>
            <div style={s.loginSub}>Sign in to view your bookings</div>
          </div>
          {loginError && <div style={s.errorMsg}>{loginError}</div>}
          <form onSubmit={login}>
            <label style={s.label}>Email</label>
            <input
              style={s.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoFocus
            />
            <label style={s.label}>Password</label>
            <input
              style={s.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button style={s.loginBtn} type="submit" disabled={loggingIn}>
              {loggingIn ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const today = bookings.filter((b) => fmtDate(b.start_time) === fmtDate(new Date().toISOString())).length;
  const thisMonth = bookings.filter((b) => {
    if (!b.start_time) return false;
    const d = new Date(b.start_time);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <span style={s.navTitle}>{businessName} — Bookings</span>
        <div style={s.navRight}>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{session.user?.email}</span>
          <button style={s.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </nav>

      <div style={s.main}>
        <div style={s.statsRow}>
          <div style={s.statCard}>
            <div style={s.statNum}>{bookings.length}</div>
            <div style={s.statLabel}>Total bookings</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statNum}>{thisMonth}</div>
            <div style={s.statLabel}>This month</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statNum}>{today}</div>
            <div style={s.statLabel}>Today</div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>All Bookings</span>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                style={s.searchInput}
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                style={s.refreshBtn}
                onClick={() => loadBookings(session.access_token)}
                disabled={loadingBookings}
              >
                {loadingBookings ? "Loading…" : "↻ Refresh"}
              </button>
            </div>
          </div>

          {loadingBookings ? (
            <div style={s.emptyRow}>Loading bookings…</div>
          ) : filtered.length === 0 ? (
            <div style={s.emptyRow}>{search ? "No bookings match your search." : "No bookings yet."}</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Name</th>
                    <th style={s.th}>Email</th>
                    <th style={s.th}>Date</th>
                    <th style={s.th}>Time</th>
                    <th style={s.th}>Notes</th>
                    <th style={s.th}>Meet</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr
                      key={b.id}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ ...s.td, fontWeight: 600 }}>{b.name}</td>
                      <td style={{ ...s.td, color: "#6B7280" }}>{b.email}</td>
                      <td style={s.td}>{fmtDate(b.start_time)}</td>
                      <td style={{ ...s.td, fontVariantNumeric: "tabular-nums" }}>
                        {fmtTime(b.start_time)} – {fmtTime(b.end_time)}
                      </td>
                      <td style={{ ...s.td, color: "#6B7280", maxWidth: 200 }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {b.notes || "—"}
                        </span>
                      </td>
                      <td style={s.td}>
                        {b.meet_link ? (
                          <a href={b.meet_link} target="_blank" rel="noreferrer" style={s.meetBtn}>
                            Join ↗
                          </a>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
