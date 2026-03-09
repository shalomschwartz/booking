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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f5f7fb; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes scaleUp { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        @keyframes checkDraw { from{stroke-dashoffset:100} to{stroke-dashoffset:0} }
        .anim { animation: fadeSlideUp 0.32s cubic-bezier(0.22,1,0.36,1) forwards; }
        .anim-scale { animation: scaleUp 0.28s cubic-bezier(0.22,1,0.36,1) forwards; }

        .day-card { transition: all 0.18s ease; cursor: pointer; }
        .day-card:hover { border-color: #2563eb !important; background: #eff6ff !important; transform: translateY(-2px); box-shadow: 0 4px 16px rgba(37,99,235,0.12) !important; }

        .slot-pill { transition: all 0.15s ease; cursor: pointer; }
        .slot-pill:hover { border-color: #2563eb !important; background: #eff6ff !important; color: #2563eb !important; }

        .btn-primary { transition: all 0.18s ease; cursor: pointer; }
        .btn-primary:hover:not(:disabled) { background: #1d4ed8 !important; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(37,99,235,0.35) !important; }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

        .btn-ghost { transition: all 0.15s ease; cursor: pointer; }
        .btn-ghost:hover { color: #2563eb !important; }

        .nav-link { transition: color 0.15s ease; }
        .nav-link:hover { color: #2563eb !important; }

        input:focus, textarea:focus {
          outline: none;
          border-color: #2563eb !important;
          box-shadow: 0 0 0 4px rgba(37,99,235,0.1) !important;
          background: #fff !important;
        }
        input::placeholder, textarea::placeholder { color: #bdc3cc; }
      `}</style>

      <Nav stepNum={step !== "done" ? stepNum : null} />

      <main style={s.main}>
        <div style={s.container}>

          {/* Page header */}
          {step !== "done" && (
            <div style={s.pageHeader}>
              <p style={s.pageEyebrow}>AI Business Solutions</p>
              <h1 style={s.pageTitle}>Book an Appointment</h1>
              <p style={s.pageSub}>Schedule a {CONFIG.SLOT_DURATION}-minute session with {CONFIG.OWNER_NAME}</p>
            </div>
          )}

          {/* Progress */}
          {step !== "done" && (
            <div style={s.progressBar}>
              {["Choose date", "Choose time", "Your details"].map((label, i) => (
                <div key={label} style={s.progressItem}>
                  <div style={{
                    ...s.progressDot,
                    background: stepNum > i ? "#2563eb" : stepNum === i ? "#fff" : "#f1f3f8",
                    border: stepNum >= i ? "2px solid #2563eb" : "2px solid #e2e6ef",
                    color: stepNum > i ? "#fff" : stepNum === i ? "#2563eb" : "#b0b8c8",
                    boxShadow: stepNum === i ? "0 0 0 4px rgba(37,99,235,0.12)" : "none",
                  }}>
                    {stepNum > i ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : i + 1}
                  </div>
                  <span style={{ ...s.progressLabel, color: stepNum >= i ? "#1e293b" : "#b0b8c8", fontWeight: stepNum === i ? 600 : 400 }}>
                    {label}
                  </span>
                  {i < 2 && (
                    <div style={{ ...s.progressLine, background: stepNum > i ? "#2563eb" : "#e2e6ef" }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Main card */}
          <div style={{ ...s.card, opacity: animating ? 0 : 1, transform: animating ? "translateY(8px)" : "translateY(0)", transition: "opacity 0.22s ease, transform 0.22s ease" }}>

            {/* STEP: DATE */}
            {step === "date" && (
              <div className="anim">
                <div style={s.cardHeader}>
                  <h2 style={s.cardTitle}>Select a date</h2>
                  <p style={s.cardSub}>Available days over the next 2 weeks</p>
                </div>
                <div style={s.divider} />
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
                          border: `2px solid ${sel ? "#2563eb" : "#e2e6ef"}`,
                          boxShadow: sel ? "0 8px 24px rgba(37,99,235,0.25)" : "0 1px 4px rgba(0,0,0,0.04)",
                          transform: sel ? "translateY(-2px)" : "none",
                        }}>
                        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: sel ? "rgba(255,255,255,0.7)" : "#94a3b8" }}>{wk}</span>
                        <span style={{ fontSize: 24, fontWeight: 700, color: sel ? "#fff" : "#1e293b", lineHeight: 1.1 }}>{day}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: sel ? "rgba(255,255,255,0.7)" : "#94a3b8" }}>{mon}</span>
                      </div>
                    );
                  })}
                </div>
                {availability.days.length === 0 && (
                  <div style={s.emptyState}>
                    <p style={{ fontSize: 14, color: "#94a3b8", textAlign: "center", lineHeight: 1.7 }}>No availability in the next 2 weeks.<br />Please check back soon.</p>
                  </div>
                )}
                <div style={s.cardFooter}>
                  <button className="btn-primary" disabled={!selectedDate}
                    style={s.btnPrimary}
                    onClick={() => goTo("time")}>
                    Continue
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 6 }}>
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* STEP: TIME */}
            {step === "time" && (
              <div className="anim">
                <div style={s.cardHeader}>
                  <button className="btn-ghost" style={s.btnBack} onClick={() => goTo("date")}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 4 }}>
                      <path d="M11 7H3M6 3L2 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Back
                  </button>
                  <h2 style={s.cardTitle}>Select a time</h2>
                  <p style={s.cardSub}>{fmtDate(selectedDate)} · {CONFIG.SLOT_DURATION}-minute sessions</p>
                </div>
                <div style={s.divider} />
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
                          border: `2px solid ${sel ? "#2563eb" : "#e2e6ef"}`,
                          boxShadow: sel ? "0 4px 16px rgba(37,99,235,0.25)" : "0 1px 4px rgba(0,0,0,0.04)",
                          fontWeight: sel ? 600 : 400,
                        }}>
                        {fmtRange(sl.start, sl.end)}
                      </div>
                    );
                  })}
                </div>
                <div style={s.cardFooter}>
                  <button className="btn-primary" disabled={!selectedSlot}
                    style={s.btnPrimary}
                    onClick={() => goTo("details")}>
                    Continue
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 6 }}>
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* STEP: DETAILS */}
            {step === "details" && (
              <div className="anim">
                <div style={s.cardHeader}>
                  <button className="btn-ghost" style={s.btnBack} onClick={() => goTo("time")}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: 4 }}>
                      <path d="M11 7H3M6 3L2 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Back
                  </button>
                  <h2 style={s.cardTitle}>Your details</h2>
                  <p style={s.cardSub}>Almost done — just a few details</p>
                </div>
                <div style={s.divider} />

                {/* Booking summary */}
                <div style={s.summaryStrip}>
                  <div style={s.summaryChip}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <rect x="1" y="2" width="11" height="10" rx="2" stroke="#2563eb" strokeWidth="1.4"/>
                      <path d="M4 1v2M9 1v2M1 5h11" stroke="#2563eb" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    {fmtDate(selectedDate)}
                  </div>
                  <div style={s.summaryChip}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <circle cx="6.5" cy="6.5" r="5.5" stroke="#2563eb" strokeWidth="1.4"/>
                      <path d="M6.5 3.5v3l2 1.5" stroke="#2563eb" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
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
                      : <p style={s.inputHint}>Confirmation will be sent to this address</p>
                    }
                  </div>
                  <div style={{ ...s.field, gridColumn: "1 / -1" }}>
                    <label style={s.label}>Notes <span style={{ color: "#b0b8c8", fontWeight: 400 }}>(optional)</span></label>
                    <textarea style={{ ...s.input, minHeight: 88, resize: "none" }}
                      placeholder="Topics to discuss, questions, or anything helpful to know beforehand…"
                      value={form.notes}
                      onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>

                <div style={s.cardFooter}>
                  <button className="btn-primary" disabled={submitting}
                    style={{ ...s.btnPrimary, opacity: submitting ? 0.75 : 1 }}
                    onClick={submitBooking}>
                    {submitting ? (
                      <>
                        <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 8 }} />
                        Confirming…
                      </>
                    ) : (
                      <>
                        Confirm booking
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 6 }}>
                          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </>
                    )}
                  </button>
                  <p style={s.secureNote}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginRight: 4 }}>
                      <path d="M6 1L2 3v3c0 2.5 1.7 4.7 4 5.4C8.3 10.7 10 8.5 10 6V3L6 1z" stroke="#94a3b8" strokeWidth="1.2" strokeLinejoin="round"/>
                    </svg>
                    Your information is secure and will never be shared
                  </p>
                </div>
              </div>
            )}

            {/* STEP: DONE */}
            {step === "done" && (
              <div className="anim" style={{ textAlign: "center", padding: "16px 0 8px" }}>
                <div style={s.successCircle}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M8 16l5.5 5.5L24 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ strokeDasharray: 100, strokeDashoffset: 0, animation: "checkDraw 0.5s ease 0.2s both" }} />
                  </svg>
                </div>
                <h2 style={{ ...s.cardTitle, fontSize: 26, marginBottom: 8 }}>Booking confirmed!</h2>
                <p style={{ ...s.cardSub, marginBottom: 32 }}>
                  We look forward to speaking with you.
                </p>

                <div style={s.confirmCard} className="anim-scale">
                  <div style={s.confirmHeader}>Appointment details</div>
                  {[
                    { icon: "📅", label: "Date", val: fmtDate(selectedDate) },
                    { icon: "🕐", label: "Time", val: `${fmtRange(selectedSlot.start, selectedSlot.end)} (${CONFIG.SLOT_DURATION} min)` },
                    { icon: "👤", label: "Name", val: form.name },
                    { icon: "📧", label: "Email", val: form.email },
                  ].map(({ icon, label, val }) => (
                    <div key={label} style={s.confirmRow}>
                      <span style={s.confirmLabel}>{label}</span>
                      <span style={s.confirmVal}>{val}</span>
                    </div>
                  ))}
                  {booking?.meetLink && (
                    <div style={{ ...s.confirmRow, paddingTop: 16, marginTop: 8, borderTop: "1px solid #e2e6ef" }}>
                      <span style={s.confirmLabel}>Meeting link</span>
                      <a href={booking.meetLink} target="_blank" rel="noreferrer" style={s.meetLink}>
                        Join Google Meet →
                      </a>
                    </div>
                  )}
                </div>

                <div style={{ background: "#eff6ff", borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#3b82f6", fontWeight: 500 }}>
                  A confirmation email has been sent to {form.email}
                </div>

                <button className="btn-primary"
                  style={{ ...s.btnPrimary, background: "#f1f5f9", color: "#475569", boxShadow: "none" }}
                  onClick={() => { setStep("date"); setSelectedDate(null); setSelectedSlot(null); setForm({ name: "", email: "", notes: "" }); setBooking(null); }}>
                  Schedule another appointment
                </button>
              </div>
            )}
          </div>

          <p style={s.footer}>© {new Date().getFullYear()} {CONFIG.BUSINESS_NAME} · All rights reserved</p>
        </div>
      </main>
    </div>
  );
}

function Nav({ stepNum }) {
  return (
    <header style={nav.bar}>
      <div style={nav.inner}>
        <div style={nav.logo}>
          <div style={nav.logoMark}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1l2 5h5l-4 3 1.5 5L8 11l-4.5 3L5 9 1 6h5z" fill="#fff" opacity="0.9"/>
            </svg>
          </div>
          <span style={nav.logoText}>{CONFIG.BUSINESS_NAME}</span>
        </div>
        <div style={nav.links}>
          <a href="#" className="nav-link" style={nav.link}>Home</a>
          <a href="#" className="nav-link" style={nav.link}>Services</a>
          <a href="#" className="nav-link" style={nav.link}>Contact</a>
        </div>
      </div>
    </header>
  );
}

const nav = {
  bar: { position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e8ecf3", },
  inner: { maxWidth: 1100, margin: "0 auto", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoMark: { width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 15, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Sans', sans-serif", letterSpacing: "-0.3px" },
  links: { display: "flex", alignItems: "center", gap: 28 },
  link: { fontSize: 14, color: "#64748b", textDecoration: "none", fontWeight: 500, fontFamily: "'DM Sans', sans-serif" },
};

const s = {
  page: { minHeight: "100vh", background: "#f5f7fb", fontFamily: "'DM Sans', sans-serif" },
  main: { padding: "40px 16px 80px" },
  container: { maxWidth: 640, margin: "0 auto" },

  loadWrap: { display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 120, gap: 16 },
  spinnerRing: { width: 36, height: 36, border: "3px solid #e2e6ef", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadText: { fontSize: 14, color: "#94a3b8", fontWeight: 500 },

  centerWrap: { display: "flex", justifyContent: "center", paddingTop: 80 },
  errorCard: { background: "#fff", borderRadius: 16, padding: "48px 40px", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", maxWidth: 400 },
  errorIcon: { width: 48, height: 48, borderRadius: "50%", background: "#fef2f2", color: "#ef4444", fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
  errorTitle: { fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 },
  errorSub: { fontSize: 14, color: "#64748b", lineHeight: 1.6 },

  pageHeader: { textAlign: "center", marginBottom: 32 },
  pageEyebrow: { fontSize: 11, fontWeight: 600, color: "#2563eb", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 8 },
  pageTitle: { fontSize: 32, fontWeight: 700, color: "#0f172a", fontFamily: "'DM Serif Display', serif", letterSpacing: "-0.5px", marginBottom: 8 },
  pageSub: { fontSize: 15, color: "#64748b", fontWeight: 400 },

  progressBar: { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28, gap: 0 },
  progressItem: { display: "flex", alignItems: "center", gap: 8 },
  progressDot: { width: 28, height: 28, borderRadius: "50%", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s ease" },
  progressLabel: { fontSize: 12, whiteSpace: "nowrap", transition: "all 0.2s ease" },
  progressLine: { width: 40, height: 2, borderRadius: 1, margin: "0 8px", transition: "background 0.3s ease" },

  card: { background: "#fff", borderRadius: 20, boxShadow: "0 4px 32px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" },
  cardHeader: { padding: "32px 32px 0" },
  cardTitle: { fontSize: 21, fontWeight: 700, color: "#0f172a", marginBottom: 4, letterSpacing: "-0.3px" },
  cardSub: { fontSize: 13, color: "#94a3b8", fontWeight: 400, lineHeight: 1.5 },
  divider: { height: 1, background: "#f1f3f8", margin: "24px 0 0" },
  cardFooter: { padding: "24px 32px 32px", display: "flex", flexDirection: "column", alignItems: "stretch", gap: 12 },

  dayGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, padding: "24px 32px" },
  dayCard: { display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 6px", borderRadius: 12, gap: 4, transition: "all 0.18s ease" },

  timeGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: "24px 32px" },
  slotPill: { padding: "12px 8px", borderRadius: 10, fontSize: 13, textAlign: "center", transition: "all 0.15s ease", letterSpacing: "0.2px" },

  btnPrimary: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "14px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 16px rgba(37,99,235,0.25)", letterSpacing: "0.1px" },
  btnBack: { display: "inline-flex", alignItems: "center", background: "none", border: "none", color: "#94a3b8", fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", padding: 0, marginBottom: 16, letterSpacing: "0.1px" },

  summaryStrip: { display: "flex", gap: 8, padding: "20px 32px", flexWrap: "wrap" },
  summaryChip: { display: "flex", alignItems: "center", gap: 6, background: "#eff6ff", color: "#2563eb", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600 },

  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "0 32px 8px" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: "#475569", letterSpacing: "0.3px", textTransform: "uppercase" },
  input: { padding: "11px 14px", background: "#f8fafc", border: "1.5px solid #e2e6ef", borderRadius: 10, color: "#0f172a", fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 400, transition: "all 0.15s ease" },
  inputErr: { borderColor: "#ef4444", background: "#fff8f8" },
  errMsg: { fontSize: 12, color: "#ef4444", fontWeight: 500 },
  inputHint: { fontSize: 11, color: "#b0b8c8" },
  secureNote: { display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#b0b8c8", fontWeight: 400 },

  successCircle: { width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 12px 32px rgba(37,99,235,0.3)" },

  confirmCard: { background: "#f8fafc", border: "1px solid #e2e6ef", borderRadius: 14, overflow: "hidden", marginBottom: 16, textAlign: "left" },
  confirmHeader: { background: "#f1f5f9", padding: "12px 20px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" },
  confirmRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #e2e6ef" },
  confirmLabel: { fontSize: 12, color: "#94a3b8", fontWeight: 500 },
  confirmVal: { fontSize: 13, color: "#0f172a", fontWeight: 600, textAlign: "right", maxWidth: "65%" },
  meetLink: { fontSize: 13, fontWeight: 600, color: "#2563eb", textDecoration: "none" },

  emptyState: { padding: "32px", background: "#f8fafc", margin: "24px 32px", borderRadius: 12, border: "1px dashed #e2e6ef" },
  footer: { textAlign: "center", fontSize: 12, color: "#b0b8c8", fontWeight: 400, marginTop: 24, letterSpacing: "0.2px" },
};
