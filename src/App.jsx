import { useState, useEffect } from "react";

const CONFIG = {
  BUSINESS_NAME: import.meta.env.VITE_BUSINESS_NAME || "Shalom AI Solutions",
  OWNER_NAME: import.meta.env.VITE_OWNER_NAME || "Your Name",
  SLOT_DURATION: parseInt(import.meta.env.VITE_SLOT_DURATION_MINS || "30"),
};

const pad = (n) => String(n).padStart(2, "0");
const fmt24 = (isoString) => {
  const d = new Date(isoString);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtRange = (start, end) => `${fmt24(start)} – ${fmt24(end)}`;
const fmtDate = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
};
const fmtShort = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  return {
    wk: d.toLocaleDateString("en-US", { weekday: "short" }),
    day: d.getDate(),
    mon: d.toLocaleDateString("en-US", { month: "short" }),
  };
};

const STEPS = ["date", "time", "details", "done"];

export default function App() {
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("date");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", notes: "" });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    fetch("/api/availability")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setAvailability(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const goTo = (nextStep) => {
    setAnimating(true);
    setTimeout(() => { setStep(nextStep); setAnimating(false); }, 220);
  };

  const slotsForDate = selectedDate
    ? availability?.days?.find((d) => d.date === selectedDate)?.slots || []
    : [];

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Please enter your name";
    if (!form.email.trim()) errs.email = "Please enter your email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email address";
    return errs;
  };

  const submitBooking = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSubmitting(true);
    try {
      const resp = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, notes: form.notes, start: selectedSlot.start, end: selectedSlot.end }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || "Booking failed");
      setBooking(data);
      goTo("done");
    } catch (e) {
      alert("Something went wrong, please try again.");
    }
    setSubmitting(false);
  };

  const stepNum = STEPS.indexOf(step);

  if (loading) return (
    <div style={s.page}>
      <Nav />
      <div style={s.loadWrap}>
        <div style={s.spinnerRing} />
        <p style={s.loadText}>Checking availability…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={s.page}>
      <Nav />
      <div style={s.centerWrap}>
        <div style={s.errorCard}>
          <div style={s.errorIcon}>!</div>
          <h3 style={s.errorTitle}>Scheduling Unavailable</h3>
          <p style={s.errorSub}>Please contact us directly to book an appointment.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Display&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f0f2f7; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scaleUp { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        .anim { animation: fadeUp 0.3s cubic-bezier(0.22,1,0.36,1) forwards; }
        .anim-scale { animation: scaleUp 0.3s cubic-bezier(0.22,1,0.36,1) forwards; }
        .day-card { transition: all 0.18s ease !important; cursor: pointer; }
        .day-card:hover { border-color: #2563eb !important; background: #eff6ff !important; transform: translateY(-3px) !important; box-shadow: 0 8px 20px rgba(37,99,235,0.15) !important; color: #1e293b !important; }
        .day-card:hover span { color: #2563eb !important; }
        .slot-pill { transition: all 0.15s ease !important; cursor: pointer; }
        .slot-pill:hover { border-color: #2563eb !important; color: #2563eb !important; background: #eff6ff !important; }
        .btn-primary { transition: all 0.18s ease !important; cursor: pointer; }
        .btn-primary:hover:not(:disabled) { background: #1d4ed8 !important; transform: translateY(-1px) !important; box-shadow: 0 10px 28px rgba(37,99,235,0.4) !important; color: #fff !important; }
        .btn-primary:active:not(:disabled) { transform: translateY(0) !important; }
        .btn-primary:disabled { opacity: 0.4 !important; cursor: not-allowed !important; }
        .btn-ghost:hover { color: #2563eb !important; }
        input:focus, textarea:focus { outline: none !important; border-color: #2563eb !important; box-shadow: 0 0 0 4px rgba(37,99,235,0.1) !important; background: #fff !important; }
        input::placeholder, textarea::placeholder { color: #c0c8d8; }
        .btn-secondary:hover { background: #e8ecf5 !important; color: #1e293b !important; }
      `}</style>

      <Nav />

      <main style={s.main}>
        <div style={s.container}>

          {step !== "done" && (
            <div style={s.pageHeader}>
              <p style={s.eyebrow}>Schedule a session</p>
              <h1 style={s.pageTitle}>Book an Appointment</h1>
              <p style={s.pageSub}>{CONFIG.SLOT_DURATION}-minute session · Video call via Google Meet</p>
            </div>
          )}

          {step !== "done" && (
            <div style={s.progressWrap}>
              {["Choose date", "Choose time", "Your details"].map((label, i) => (
                <div key={label} style={s.progressItem}>
                  <div style={{
                    ...s.progressDot,
                    background: stepNum > i ? "#2563eb" : stepNum === i ? "#fff" : "#e8ecf5",
                    border: `2px solid ${stepNum >= i ? "#2563eb" : "#dde2ef"}`,
                    color: stepNum > i ? "#fff" : stepNum === i ? "#2563eb" : "#aab0c4",
                    boxShadow: stepNum === i ? "0 0 0 5px rgba(37,99,235,0.1)" : "none",
                  }}>
                    {stepNum > i ? (
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M2 5.5l2.5 2.5L9 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : i + 1}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: stepNum === i ? 600 : 400, color: stepNum >= i ? "#1e293b" : "#aab0c4" }}>
                    {label}
                  </span>
                  {i < 2 && <div style={{ flex: 1, height: 2, background: stepNum > i ? "#2563eb" : "#dde2ef", borderRadius: 1, minWidth: 32, maxWidth: 64 }} />}
                </div>
              ))}
            </div>
          )}

          <div style={{ ...s.card, opacity: animating ? 0 : 1, transform: animating ? "translateY(10px)" : "translateY(0)", transition: "opacity 0.22s, transform 0.22s" }}>

            {step === "date" && (
              <div className="anim">
                <div style={s.sectionHead}>
                  <h2 style={s.sectionTitle}>Select a date</h2>
                  <p style={s.sectionSub}>Available days over the next 2 weeks</p>
                </div>
                <div style={s.dayGrid}>
                  {availability.days.map((d) => {
                    const sel = selectedDate === d.date;
                    const { wk, day, mon } = fmtShort(d.date);
                    return (
                      <div key={d.date} className="day-card"
                        onClick={() => { setSelectedDate(d.date); setSelectedSlot(null); }}
                        style={{
                          ...s.dayCard,
                          background: sel ? "#2563eb" : "#fff",
                          border: `2px solid ${sel ? "#2563eb" : "#e4e9f2"}`,
                          boxShadow: sel ? "0 8px 24px rgba(37,99,235,0.28)" : "0 2px 8px rgba(0,0,0,0.04)",
                          transform: sel ? "translateY(-3px)" : "none",
                        }}>
                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", color: sel ? "rgba(255,255,255,0.75)" : "#8896b0" }}>{wk}</span>
                        <span style={{ fontSize: 26, fontWeight: 700, color: sel ? "#fff" : "#1e293b", lineHeight: 1 }}>{day}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: sel ? "rgba(255,255,255,0.75)" : "#8896b0" }}>{mon}</span>
                      </div>
                    );
                  })}
                </div>
                {availability.days.length === 0 && (
                  <div style={s.emptyBox}>No availability in the next 2 weeks. Please check back soon.</div>
                )}
                <div style={s.btnWrap}>
                  <button className="btn-primary" disabled={!selectedDate} style={s.btnPrimary} onClick={() => goTo("time")}>
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {step === "time" && (
              <div className="anim">
                <div style={s.sectionHead}>
                  <button className="btn-ghost" style={s.btnBack} onClick={() => goTo("date")}>← Back</button>
                  <h2 style={s.sectionTitle}>Select a time</h2>
                  <p style={s.sectionSub}>{fmtDate(selectedDate)} · {CONFIG.SLOT_DURATION}-minute sessions</p>
                </div>
                <div style={s.timeGrid}>
                  {slotsForDate.map((sl, i) => {
                    const sel = selectedSlot?.start === sl.start;
                    return (
                      <div key={i} className="slot-pill"
                        onClick={() => setSelectedSlot(sl)}
                        style={{
                          ...s.slotPill,
                          background: sel ? "#2563eb" : "#fff",
                          color: sel ? "#fff" : "#1e293b",
                          border: `2px solid ${sel ? "#2563eb" : "#e4e9f2"}`,
                          boxShadow: sel ? "0 4px 16px rgba(37,99,235,0.25)" : "0 2px 8px rgba(0,0,0,0.04)",
                          fontWeight: sel ? 600 : 400,
                        }}>
                        {fmtRange(sl.start, sl.end)}
                      </div>
                    );
                  })}
                </div>
                <div style={s.btnWrap}>
                  <button className="btn-primary" disabled={!selectedSlot} style={{ ...s.btnPrimary, opacity: selectedSlot ? 1 : 0.4 }} onClick={() => goTo("details")}>
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {step === "details" && (
              <div className="anim">
                <div style={s.sectionHead}>
                  <button className="btn-ghost" style={s.btnBack} onClick={() => goTo("time")}>← Back</button>
                  <h2 style={s.sectionTitle}>Your details</h2>
                  <p style={s.sectionSub}>Almost done — just a couple more things</p>
                </div>

                <div style={s.summaryRow}>
                  <div style={s.summaryChip}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="#2563eb" strokeWidth="1.5"/><path d="M4.5 1.5v2M9.5 1.5v2M1.5 5.5h11" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    {fmtDate(selectedDate)}
                  </div>
                  <div style={s.summaryChip}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#2563eb" strokeWidth="1.5"/><path d="M7 4v3l2 1.5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    {fmtRange(selectedSlot.start, selectedSlot.end)} · {CONFIG.SLOT_DURATION} min
                  </div>
                </div>

                <div style={s.formGrid}>
                  <div style={s.field}>
                    <label style={s.label}>Full name</label>
                    <input style={{ ...s.input, ...(formErrors.name ? s.inputErr : {}) }}
                      placeholder="Jane Smith" value={form.name} autoFocus
                      onChange={(e) => { setForm(f => ({ ...f, name: e.target.value })); setFormErrors(fe => ({ ...fe, name: undefined })); }} />
                    {formErrors.name && <p style={s.errMsg}>{formErrors.name}</p>}
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Email address</label>
                    <input style={{ ...s.input, ...(formErrors.email ? s.inputErr : {}) }}
                      type="email" placeholder="jane@company.com" value={form.email}
                      onChange={(e) => { setForm(f => ({ ...f, email: e.target.value })); setFormErrors(fe => ({ ...fe, email: undefined })); }} />
                    {formErrors.email
                      ? <p style={s.errMsg}>{formErrors.email}</p>
                      : <p style={s.inputHint}>Confirmation email will be sent here</p>
                    }
                  </div>
                  <div style={{ ...s.field, gridColumn: "1 / -1" }}>
                    <label style={s.label}>Notes <span style={{ color: "#b0b8c8", fontWeight: 400 }}>(optional)</span></label>
                    <textarea style={{ ...s.input, minHeight: 96, resize: "none" }}
                      placeholder="Topics to discuss, questions, or anything helpful to know beforehand…"
                      value={form.notes}
                      onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>

                <div style={s.btnWrap}>
                  <button className="btn-primary" disabled={submitting}
                    style={{ ...s.btnPrimary, opacity: submitting ? 0.7 : 1 }}
                    onClick={submitBooking}>
                    {submitting ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                        <span style={{ width: 18, height: 18, border: "2.5px solid rgba(255,255,255,0.3)", borderTop: "2.5px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                        Confirming…
                      </span>
                    ) : "Confirm booking"}
                  </button>
                  <p style={{ textAlign: "center", fontSize: 13, color: "#aab0c4", marginTop: 4 }}>
                    🔒 Your information is secure and never shared
                  </p>
                </div>
              </div>
            )}

            {step === "done" && (
              <div className="anim" style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={s.successCircle}>
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <path d="M9 18l6 6L27 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 style={{ fontSize: 30, fontWeight: 700, color: "#0f172a", marginBottom: 10, fontFamily: "'DM Serif Display', serif" }}>Booking confirmed!</h2>
                <p style={{ fontSize: 17, color: "#64748b", marginBottom: 36, lineHeight: 1.6 }}>
                  We look forward to speaking with you.
                </p>

                <div style={s.confirmCard} className="anim-scale">
                  <div style={s.confirmCardHeader}>Appointment Summary</div>
                  {[
                    { label: "Date", val: fmtDate(selectedDate) },
                    { label: "Time", val: `${fmtRange(selectedSlot.start, selectedSlot.end)} (${CONFIG.SLOT_DURATION} min)` },
                    { label: "Name", val: form.name },
                    { label: "Email", val: form.email },
                  ].map(({ label, val }) => (
                    <div key={label} style={s.confirmRow}>
                      <span style={s.confirmLabel}>{label}</span>
                      <span style={s.confirmVal}>{val}</span>
                    </div>
                  ))}
                  {booking?.meetLink && (
                    <div style={{ ...s.confirmRow, borderBottom: "none" }}>
                      <span style={s.confirmLabel}>Meeting link</span>
                      <a href={booking.meetLink} target="_blank" rel="noreferrer" style={{ fontSize: 15, fontWeight: 600, color: "#2563eb", textDecoration: "none" }}>
                        Join Google Meet →
                      </a>
                    </div>
                  )}
                </div>

                <div style={s.emailBanner}>
                  ✉️ &nbsp; A confirmation email has been sent to <strong>{form.email}</strong>
                </div>

                <button className="btn-secondary"
                  style={s.btnSecondary}
                  onClick={() => { setStep("date"); setSelectedDate(null); setSelectedSlot(null); setForm({ name: "", email: "", notes: "" }); setBooking(null); }}>
                  Schedule another appointment
                </button>
              </div>
            )}
          </div>

          <p style={{ textAlign: "center", fontSize: 13, color: "#aab0c4", marginTop: 24 }}>
            © {new Date().getFullYear()} {CONFIG.BUSINESS_NAME} · Secure scheduling
          </p>
        </div>
      </main>
    </div>
  );
}

function Nav() {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e8ecf5" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px", height: 68, display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2l2.5 5h5.5l-4.5 3.5 1.5 5.5L9 13l-4.5 3 1.5-5.5L1.5 7H7z" fill="#fff"/>
            </svg>
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.3px" }}>
            {CONFIG.BUSINESS_NAME}
          </span>
        </div>
      </div>
    </header>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#f0f2f7", fontFamily: "'DM Sans', sans-serif" },
  main: { padding: "48px 16px 80px" },
  container: { maxWidth: 660, margin: "0 auto" },
  loadWrap: { display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 120, gap: 16 },
  spinnerRing: { width: 40, height: 40, border: "3px solid #dde2ef", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadText: { fontSize: 16, color: "#8896b0", fontWeight: 500 },
  centerWrap: { display: "flex", justifyContent: "center", paddingTop: 80 },
  errorCard: { background: "#fff", borderRadius: 20, padding: "56px 48px", textAlign: "center", boxShadow: "0 4px 32px rgba(0,0,0,0.08)", maxWidth: 420 },
  errorIcon: { width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", color: "#ef4444", fontSize: 24, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  errorTitle: { fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 10 },
  errorSub: { fontSize: 15, color: "#64748b", lineHeight: 1.7 },
  pageHeader: { textAlign: "center", marginBottom: 36 },
  eyebrow: { fontSize: 13, fontWeight: 600, color: "#2563eb", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10 },
  pageTitle: { fontSize: 38, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Serif Display', serif", letterSpacing: "-0.5px", marginBottom: 10 },
  pageSub: { fontSize: 16, color: "#64748b", fontWeight: 400 },
  progressWrap: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 32, flexWrap: "wrap" },
  progressItem: { display: "flex", alignItems: "center", gap: 10 },
  progressDot: { width: 32, height: 32, borderRadius: "50%", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" },
  card: { background: "#fff", borderRadius: 24, boxShadow: "0 4px 40px rgba(0,0,0,0.07)", overflow: "hidden" },
  sectionHead: { padding: "36px 36px 0" },
  sectionTitle: { fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.3px" },
  sectionSub: { fontSize: 15, color: "#64748b", fontWeight: 400, lineHeight: 1.5 },
  dayGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, padding: "28px 36px" },
  dayCard: { display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 6px", borderRadius: 14, gap: 5 },
  timeGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, padding: "28px 36px" },
  slotPill: { padding: "14px 8px", borderRadius: 12, fontSize: 14, textAlign: "center", letterSpacing: "0.3px" },
  summaryRow: { display: "flex", gap: 10, padding: "20px 36px", flexWrap: "wrap" },
  summaryChip: { display: "inline-flex", alignItems: "center", gap: 7, background: "#eff6ff", color: "#2563eb", borderRadius: 10, padding: "9px 14px", fontSize: 14, fontWeight: 600 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, padding: "4px 36px 8px" },
  field: { display: "flex", flexDirection: "column", gap: 7 },
  label: { fontSize: 13, fontWeight: 600, color: "#374151", letterSpacing: "0.2px" },
  input: { padding: "13px 16px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, color: "#0f172a", fontSize: 15, fontFamily: "'DM Sans', sans-serif", fontWeight: 400, transition: "all 0.15s" },
  inputErr: { borderColor: "#ef4444", background: "#fff8f8" },
  errMsg: { fontSize: 13, color: "#ef4444", fontWeight: 500 },
  inputHint: { fontSize: 13, color: "#94a3b8" },
  btnWrap: { padding: "8px 36px 36px", display: "flex", flexDirection: "column", gap: 12 },
  btnPrimary: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "16px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 20px rgba(37,99,235,0.25)", letterSpacing: "0.1px" },
  btnSecondary: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "16px 24px", background: "#f1f5f9", color: "#1e293b", border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: 16, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", boxShadow: "none", letterSpacing: "0.1px", cursor: "pointer", transition: "all 0.18s ease" },
  btnBack: { background: "none", border: "none", color: "#8896b0", fontSize: 14, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", padding: 0, marginBottom: 18, display: "inline-flex", alignItems: "center", letterSpacing: "0.1px" },
  successCircle: { width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 16px 40px rgba(37,99,235,0.35)" },
  confirmCard: { background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 16, overflow: "hidden", marginBottom: 20, textAlign: "left" },
  confirmCardHeader: { background: "#f1f5f9", padding: "14px 24px", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" },
  confirmRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 24px", borderBottom: "1px solid #e8ecf5" },
  confirmLabel: { fontSize: 14, color: "#64748b", fontWeight: 500 },
  confirmVal: { fontSize: 15, color: "#0f172a", fontWeight: 600, textAlign: "right", maxWidth: "60%" },
  emailBanner: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "14px 20px", marginBottom: 24, fontSize: 14, color: "#1d4ed8", fontWeight: 500, lineHeight: 1.6 },
  emptyBox: { background: "#f8fafc", border: "1.5px dashed #dde2ef", borderRadius: 14, padding: "32px", fontSize: 15, color: "#8896b0", textAlign: "center", margin: "0 36px 28px", lineHeight: 1.7 },
};
