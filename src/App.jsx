import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG = {
  GOOGLE_CLIENT_ID: "355268497015-q2o03ub1bqqqn25pms6v0e5qh8ud097u.apps.googleusercontent.com",
  BUSINESS_NAME: "Your Business",
  SLOT_DURATION: 60,
  WORK_START: 9,
  WORK_END: 18,
  DAYS_AHEAD: 14,
  TIMEZONE: "Asia/Jerusalem",
  CALENDAR_ID: "primary",
};

const SCOPES = "https://www.googleapis.com/auth/calendar";

const pad = (n) => String(n).padStart(2, "0");
const fmt12 = (h, m = 0) => {
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${ampm}`;
};
const isoDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayLabel = (d) =>
  d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

function generateSlots(date, busyIntervals) {
  const slots = [];
  const dayStart = new Date(date);
  dayStart.setHours(CONFIG.WORK_START, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(CONFIG.WORK_END, 0, 0, 0);
  let cur = new Date(dayStart);
  while (cur < dayEnd) {
    const end = new Date(cur.getTime() + CONFIG.SLOT_DURATION * 60000);
    if (end > dayEnd) break;
    const busy = busyIntervals.some(
      (b) => new Date(b.start) < end && new Date(b.end) > cur
    );
    if (!busy) slots.push({ start: new Date(cur), end: new Date(end) });
    cur = end;
  }
  return slots;
}

const STEPS = ["date", "time", "details", "confirm", "done"];

export default function BookingApp() {
  const [gapiReady, setGapiReady] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [step, setStep] = useState("date");
  const [selectedDate, setSelectedDate] = useState(null);
  const [busyMap, setBusyMap] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", notes: "" });
  const [formErrors, setFormErrors] = useState({});
  const [booking, setBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const scriptGapi = document.createElement("script");
    scriptGapi.src = "https://apis.google.com/js/api.js";
    scriptGapi.onload = () => {
      window.gapi.load("client", async () => {
        await window.gapi.client.init({
          discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
        });
        setGapiReady(true);
      });
    };
    document.body.appendChild(scriptGapi);

    const scriptGis = document.createElement("script");
    scriptGis.src = "https://accounts.google.com/gsi/client";
    scriptGis.onload = () => {
      const tc = window.google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (resp) => {
          if (resp.error) {
            setAuthError(resp.error);
          } else {
            setAccessToken(resp.access_token);
            window.gapi.client.setToken({ access_token: resp.access_token });
          }
        },
      });
      setTokenClient(tc);
      setGisReady(true);
    };
    document.body.appendChild(scriptGis);
  }, []);

  const signIn = () => {
    if (tokenClient) tokenClient.requestAccessToken();
  };

  const fetchBusy = useCallback(
    async (dates) => {
      if (!accessToken) return;
      setLoadingSlots(true);
      try {
        const timeMin = new Date(dates[0]);
        timeMin.setHours(0, 0, 0, 0);
        const timeMax = new Date(dates[dates.length - 1]);
        timeMax.setHours(23, 59, 59, 999);
        const resp = await window.gapi.client.calendar.freebusy.query({
          resource: {
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            timeZone: CONFIG.TIMEZONE,
            items: [{ id: CONFIG.CALENDAR_ID }],
          },
        });
        const busy = resp.result.calendars[CONFIG.CALENDAR_ID]?.busy || [];
        const map = {};
        dates.forEach((d) => {
          const key = isoDate(d);
          map[key] = busy.filter((b) => isoDate(new Date(b.start)) === key);
        });
        setBusyMap((prev) => ({ ...prev, ...map }));
      } catch (e) {
        console.error(e);
      }
      setLoadingSlots(false);
    },
    [accessToken]
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const calDays = Array.from({ length: CONFIG.DAYS_AHEAD }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  useEffect(() => {
    if (accessToken && calDays.length) fetchBusy(calDays);
  }, [accessToken]);

  const slots = selectedDate
    ? generateSlots(selectedDate, busyMap[isoDate(selectedDate)] || [])
    : [];

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Enter a valid email";
    return errs;
  };

  const submitBooking = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSubmitting(true);
    try {
      const event = {
        summary: `Appointment: ${form.name}`,
        description: `Client: ${form.name}\nEmail: ${form.email}${form.notes ? `\nNotes: ${form.notes}` : ""}`,
        start: { dateTime: selectedSlot.start.toISOString(), timeZone: CONFIG.TIMEZONE },
        end: { dateTime: selectedSlot.end.toISOString(), timeZone: CONFIG.TIMEZONE },
        attendees: [{ email: form.email, displayName: form.name }],
        sendUpdates: "all",
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "popup", minutes: 30 },
          ],
        },
      };
      const resp = await window.gapi.client.calendar.events.insert({
        calendarId: CONFIG.CALENDAR_ID,
        resource: event,
        sendUpdates: "all",
      });
      setBooking(resp.result);
      setStep("done");
    } catch (e) {
      console.error(e);
      alert("Failed to create booking. Please try again.");
    }
    setSubmitting(false);
  };

  const cancelBooking = async () => {
    if (!booking) return;
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await window.gapi.client.calendar.events.delete({
        calendarId: CONFIG.CALENDAR_ID,
        eventId: booking.id,
        sendUpdates: "all",
      });
      setBooking(null);
      setStep("date");
      setSelectedDate(null);
      setSelectedSlot(null);
      setForm({ name: "", email: "", notes: "" });
    } catch (e) {
      alert("Could not cancel. Please try again.");
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.orb1} />
      <div style={styles.orb2} />
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.headerIcon}>📅</div>
          <div>
            <h1 style={styles.title}>{CONFIG.BUSINESS_NAME}</h1>
            <p style={styles.subtitle}>Schedule an appointment</p>
          </div>
        </div>

        {step !== "done" && (
          <div style={styles.stepBar}>
            {["Date", "Time", "Details", "Confirm"].map((label, i) => {
              const stepIdx = STEPS.indexOf(step);
              const active = stepIdx === i;
              const done = stepIdx > i;
              return (
                <div key={label} style={styles.stepItem}>
                  <div style={{
                    ...styles.stepDot,
                    background: done ? "#6366f1" : active ? "#fff" : "transparent",
                    border: done ? "2px solid #6366f1" : active ? "2px solid #6366f1" : "2px solid #374151",
                    color: done ? "#fff" : active ? "#6366f1" : "#6b7280",
                  }}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span style={{ ...styles.stepLabel, color: active ? "#f9fafb" : done ? "#a5b4fc" : "#6b7280" }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* AUTH */}
        {!accessToken && (
          <div style={styles.authBox}>
            <p style={styles.authText}>Connect your Google Calendar to manage availability and create appointment events automatically.</p>
            <button style={styles.googleBtn} onClick={signIn} disabled={!gapiReady || !gisReady}>
              <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 10 }}>
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              Sign in with Google
            </button>
            {authError && <p style={{ color: "#f87171", marginTop: 8 }}>{authError}</p>}
          </div>
        )}

        {/* STEP: DATE */}
        {accessToken && step === "date" && (
          <div>
            <h2 style={styles.sectionTitle}>Pick a date</h2>
            {loadingSlots && <p style={styles.hint}>Loading your calendar…</p>}
            <div style={styles.calGrid}>
              {calDays.map((d) => {
                const key = isoDate(d);
                const available = generateSlots(d, busyMap[key] || []).length > 0;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const sel = selectedDate && isoDate(selectedDate) === key;
                return (
                  <button key={key} style={{ ...styles.dayBtn, ...(sel ? styles.dayBtnSelected : {}), ...(!available || isWeekend ? styles.dayBtnDisabled : {}) }}
                    disabled={!available || isWeekend} onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}>
                    <span style={styles.dayName}>{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                    <span style={styles.dayNum}>{d.getDate()}</span>
                    <span style={styles.dayMonth}>{d.toLocaleDateString("en-US", { month: "short" })}</span>
                  </button>
                );
              })}
            </div>
            <div style={styles.btnRow}>
              <button style={{ ...styles.primaryBtn, opacity: selectedDate ? 1 : 0.4, cursor: selectedDate ? "pointer" : "not-allowed" }}
                disabled={!selectedDate} onClick={() => setStep("time")}>
                Next: Pick a time →
              </button>
            </div>
          </div>
        )}

        {/* STEP: TIME */}
        {accessToken && step === "time" && (
          <div>
            <h2 style={styles.sectionTitle}>Available slots — {dayLabel(selectedDate)}</h2>
            {slots.length === 0 ? <p style={styles.hint}>No available slots on this day.</p> : (
              <div style={styles.slotsGrid}>
                {slots.map((s, i) => {
                  const sel = selectedSlot && s.start.getTime() === selectedSlot.start.getTime();
                  return (
                    <button key={i} style={{ ...styles.slotBtn, ...(sel ? styles.slotBtnSelected : {}) }}
                      onClick={() => setSelectedSlot(s)}>
                      {fmt12(s.start.getHours(), s.start.getMinutes())}
                    </button>
                  );
                })}
              </div>
            )}
            <div style={styles.btnRow}>
              <button style={styles.ghostBtn} onClick={() => setStep("date")}>← Back</button>
              <button style={{ ...styles.primaryBtn, opacity: selectedSlot ? 1 : 0.4, cursor: selectedSlot ? "pointer" : "not-allowed" }}
                disabled={!selectedSlot} onClick={() => setStep("details")}>
                Next: Your details →
              </button>
            </div>
          </div>
        )}

        {/* STEP: DETAILS */}
        {accessToken && step === "details" && (
          <div>
            <h2 style={styles.sectionTitle}>Your information</h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>Full name *</label>
              <input style={{ ...styles.input, ...(formErrors.name ? styles.inputError : {}) }}
                placeholder="Jane Smith" value={form.name}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setFormErrors((fe) => ({ ...fe, name: undefined })); }} />
              {formErrors.name && <p style={styles.errorMsg}>{formErrors.name}</p>}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email address *</label>
              <input style={{ ...styles.input, ...(formErrors.email ? styles.inputError : {}) }}
                type="email" placeholder="jane@example.com" value={form.email}
                onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setFormErrors((fe) => ({ ...fe, email: undefined })); }} />
              {formErrors.email && <p style={styles.errorMsg}>{formErrors.email}</p>}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Notes (optional)</label>
              <textarea style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
                placeholder="Anything you'd like me to know beforehand…" value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={styles.btnRow}>
              <button style={styles.ghostBtn} onClick={() => setStep("time")}>← Back</button>
              <button style={styles.primaryBtn} onClick={() => {
                const errs = validate();
                if (Object.keys(errs).length) { setFormErrors(errs); return; }
                setStep("confirm");
              }}>Review booking →</button>
            </div>
          </div>
        )}

        {/* STEP: CONFIRM */}
        {accessToken && step === "confirm" && (
          <div>
            <h2 style={styles.sectionTitle}>Confirm your booking</h2>
            <div style={styles.summaryBox}>
              {[
                { icon: "📅", label: "Date", value: dayLabel(selectedDate) },
                { icon: "🕐", label: "Time", value: `${fmt12(selectedSlot.start.getHours(), selectedSlot.start.getMinutes())} – ${fmt12(selectedSlot.end.getHours(), selectedSlot.end.getMinutes())}` },
                { icon: "⏱", label: "Duration", value: `${CONFIG.SLOT_DURATION} minutes` },
                { icon: "👤", label: "Name", value: form.name },
                { icon: "✉️", label: "Email", value: form.email },
                ...(form.notes ? [{ icon: "📝", label: "Notes", value: form.notes }] : []),
              ].map(({ icon, label, value }) => (
                <div key={label} style={styles.summaryRow}>
                  <span style={styles.summaryIcon}>{icon}</span>
                  <div>
                    <div style={styles.summaryLabel}>{label}</div>
                    <div style={styles.summaryValue}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
            <p style={styles.hint}>A calendar invite and confirmation email will be sent to {form.email}.</p>
            <div style={styles.btnRow}>
              <button style={styles.ghostBtn} onClick={() => setStep("details")}>← Edit</button>
              <button style={{ ...styles.primaryBtn, opacity: submitting ? 0.6 : 1 }} disabled={submitting} onClick={submitBooking}>
                {submitting ? "Booking…" : "Confirm appointment ✓"}
              </button>
            </div>
          </div>
        )}

        {/* STEP: DONE */}
        {step === "done" && booking && (
          <div style={styles.doneBox}>
            <div style={styles.doneIcon}>🎉</div>
            <h2 style={styles.doneTitle}>Booking confirmed!</h2>
            <p style={styles.doneText}>
              Your appointment on <strong>{dayLabel(selectedDate)}</strong> at{" "}
              <strong>{fmt12(selectedSlot.start.getHours(), selectedSlot.start.getMinutes())}</strong>{" "}
              has been added to the calendar. A confirmation has been sent to <strong>{form.email}</strong>.
            </p>
            <div style={styles.btnRow}>
              <button style={styles.dangerBtn} onClick={cancelBooking}>Cancel appointment</button>
              <button style={styles.primaryBtn} onClick={() => {
                setStep("date"); setSelectedDate(null); setSelectedSlot(null);
                setForm({ name: "", email: "", notes: "" }); setBooking(null);
              }}>Book another</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "'Georgia', 'Times New Roman', serif", position: "relative", overflow: "hidden" },
  orb1: { position: "fixed", top: -120, left: -120, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)", pointerEvents: "none" },
  orb2: { position: "fixed", bottom: -100, right: -100, width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)", pointerEvents: "none" },
  card: { width: "100%", maxWidth: 560, background: "rgba(17,17,27,0.95)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 20, padding: "36px 32px", backdropFilter: "blur(20px)", boxShadow: "0 32px 80px rgba(0,0,0,0.6)", position: "relative", zIndex: 1 },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 28, paddingBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.07)" },
  headerIcon: { fontSize: 36, lineHeight: 1 },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: "#f9fafb", letterSpacing: "-0.5px" },
  subtitle: { margin: 0, fontSize: 13, color: "#6b7280", fontFamily: "'Helvetica Neue', sans-serif" },
  stepBar: { display: "flex", gap: 4, marginBottom: 28, alignItems: "center" },
  stepItem: { display: "flex", alignItems: "center", gap: 6, flex: 1 },
  stepDot: { width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: "'Helvetica Neue', sans-serif", flexShrink: 0, transition: "all 0.2s" },
  stepLabel: { fontSize: 11, fontFamily: "'Helvetica Neue', sans-serif", fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase", transition: "color 0.2s" },
  authBox: { textAlign: "center", padding: "24px 0" },
  authText: { color: "#9ca3af", fontSize: 14, fontFamily: "'Helvetica Neue', sans-serif", marginBottom: 20, lineHeight: 1.6 },
  googleBtn: { display: "inline-flex", alignItems: "center", padding: "12px 24px", background: "#fff", color: "#1f2937", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: "'Helvetica Neue', sans-serif", cursor: "pointer" },
  sectionTitle: { margin: "0 0 18px", fontSize: 17, fontWeight: 700, color: "#f9fafb", letterSpacing: "-0.3px" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 20 },
  dayBtn: { display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 2px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, cursor: "pointer", transition: "all 0.15s", gap: 2 },
  dayBtnSelected: { background: "rgba(99,102,241,0.2)", border: "1px solid #6366f1" },
  dayBtnDisabled: { opacity: 0.25, cursor: "not-allowed" },
  dayName: { fontSize: 9, color: "#6b7280", fontFamily: "'Helvetica Neue', sans-serif", textTransform: "uppercase", letterSpacing: "0.5px" },
  dayNum: { fontSize: 16, fontWeight: 700, color: "#f9fafb", fontFamily: "'Helvetica Neue', sans-serif" },
  dayMonth: { fontSize: 9, color: "#6b7280", fontFamily: "'Helvetica Neue', sans-serif" },
  slotsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 },
  slotBtn: { padding: "12px 8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#d1d5db", fontSize: 14, fontFamily: "'Helvetica Neue', sans-serif", fontWeight: 500, cursor: "pointer" },
  slotBtnSelected: { background: "rgba(99,102,241,0.2)", border: "1px solid #6366f1", color: "#a5b4fc" },
  formGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#9ca3af", fontFamily: "'Helvetica Neue', sans-serif", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 6 },
  input: { width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#f9fafb", fontSize: 15, fontFamily: "'Helvetica Neue', sans-serif", outline: "none", boxSizing: "border-box" },
  inputError: { borderColor: "#f87171" },
  errorMsg: { color: "#f87171", fontSize: 12, margin: "4px 0 0", fontFamily: "'Helvetica Neue', sans-serif" },
  hint: { color: "#6b7280", fontSize: 13, fontFamily: "'Helvetica Neue', sans-serif", marginBottom: 12, lineHeight: 1.5 },
  summaryBox: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 14 },
  summaryRow: { display: "flex", alignItems: "flex-start", gap: 14 },
  summaryIcon: { fontSize: 18, width: 24, flexShrink: 0 },
  summaryLabel: { fontSize: 11, color: "#6b7280", fontFamily: "'Helvetica Neue', sans-serif", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 },
  summaryValue: { fontSize: 15, color: "#f9fafb", fontFamily: "'Helvetica Neue', sans-serif", fontWeight: 500 },
  btnRow: { display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" },
  primaryBtn: { padding: "12px 22px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "'Helvetica Neue', sans-serif", cursor: "pointer" },
  ghostBtn: { padding: "12px 18px", background: "transparent", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 14, fontFamily: "'Helvetica Neue', sans-serif", cursor: "pointer" },
  dangerBtn: { padding: "12px 18px", background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, fontSize: 14, fontFamily: "'Helvetica Neue', sans-serif", cursor: "pointer" },
  doneBox: { textAlign: "center", padding: "16px 0" },
  doneIcon: { fontSize: 52, marginBottom: 16 },
  doneTitle: { margin: "0 0 12px", fontSize: 22, fontWeight: 700, color: "#f9fafb" },
  doneText: { color: "#9ca3af", fontSize: 14, fontFamily: "'Helvetica Neue', sans-serif", lineHeight: 1.7, marginBottom: 24 },
};
