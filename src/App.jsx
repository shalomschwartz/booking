import { useState, useEffect } from "react";

const CONFIG = {
  BUSINESS_NAME: import.meta.env.VITE_BUSINESS_NAME || "Your Business",
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
    setTimeout(() => { setStep(nextStep); setAnimating(false); }, 200);
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
      <div style={s.loadWrap}>
        <div style={s.spinner} />
        <p style={s.loadText}>Loading availability…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.errorCard}>
          <p style={s.errorTitle}>Scheduling Unavailable</p>
          <p style={s.errorSub}>Please contact us directly to book an appointment.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sora:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        .fade-up { animation: fadeUp 0.24s cubic-bezier(0.22,1,0.36,1) forwards; }
        .scale-in { animation: scaleIn 0.3s cubic-bezier(0.22,1,0.36,1) forwards; }
        .day-btn:hover { background: #f4f4f8 !important; border-color: #6366f1 !important; }
        .slot-btn:hover { background: #f4f4f8 !important; border-color: #6366f1 !important; }
        .primary-btn:hover:not(:disabled) { background: #4f46e5 !important; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(99,102,241,0.3) !important; }
        .primary-btn:active:not(:disabled) { transform: translateY(0); }
        .back-btn:hover { color: #1a1a2e !important; }
        input:focus, textarea:focus { outline: none !important; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important; }
      `}</style>

      <div style={s.wrap}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <p style={s.headerLabel}>Schedule a meeting</p>
            <h1 style={s.headerTitle}>{CONFIG.BUSINESS_NAME}</h1>
          </div>
          {step !== "done" && (
            <div style={s.stepTrack}>
              {["Date", "Time", "Details"].map((label, i) => (
                <div key={label} style={s.stepItem}>
                  <div style={{
                    ...s.stepDot,
                    background: stepNum > i ? "#6366f1" : stepNum === i ? "#fff" : "transparent",
                    border: stepNum > i ? "2px solid #6366f1" : stepNum === i ? "2px solid #6366f1" : "2px solid #d1d1e0",
                    color: stepNum > i ? "#fff" : stepNum === i ? "#6366f1" : "#aaa",
                  }}>
                    {stepNum > i ? "✓" : i + 1}
                  </div>
                  <span style={{ ...s.stepLabel, color: stepNum === i ? "#1a1a2e" : "#aaa", fontWeight: stepNum === i ? 600 : 400 }}>{label}</span>
                  {i < 2 && <div style={{ ...s.stepLine, background: stepNum > i ? "#6366f1" : "#e4e4f0" }} />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card */}
        <div style={{ ...s.card, opacity: animating ? 0 : 1, transition: "opacity 0.2s" }}>

          {/* DATE */}
          {step === "date" && (
            <div className="fade-up">
              <h2 style={s.cardTitle}>Select a date</h2>
              <p style={s.cardSub}>Available days for the next 2 weeks</p>
              <div style={s.dayGrid}>
                {availability.days.map((d) => {
                  const sel = selectedDate === d.date;
                  const { wk, day, mon } = fmtShort(d.date);
                  return (
                    <button key={d.date} className="day-btn"
                      onClick={() => { setSelectedDate(d.date); setSelectedSlot(null); }}
                      style={{
                        ...s.dayBtn,
                        background: sel ? "#6366f1" : "#fff",
                        color: sel ? "#fff" : "#1a1a2e",
                        border: `1.5px solid ${sel ? "#6366f1" : "#e4e4f0"}`,
                        boxShadow: sel ? "0 4px 16px rgba(99,102,241,0.25)" : "none",
                      }}>
                      <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>{wk}</span>
                      <span style={{ fontSize: 20, fontWeight: 700 }}>{day}</span>
                      <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.7 }}>{mon}</span>
                    </button>
                  );
                })}
              </div>
              {availability.days.length === 0 && (
                <div style={s.emptyBox}>No availability in the next 2 weeks. Please check back soon.</div>
              )}
              <button className="primary-btn" disabled={!selectedDate}
                style={{ ...s.primaryBtn, opacity: selectedDate ? 1 : 0.4 }}
                onClick={() => goTo("time")}>
                Continue
              </button>
            </div>
          )}

          {/* TIME */}
          {step === "time" && (
            <div className="fade-up">
              <button className="back-btn" style={s.backBtn} onClick={() => goTo("date")}>← Back</button>
              <h2 style={s.cardTitle}>Select a time</h2>
              <p style={s.cardSub}>{fmtDate(selectedDate)} · {CONFIG.SLOT_DURATION} min session</p>
              <div style={s.timeGrid}>
                {slotsForDate.map((sl, i) => {
                  const sel = selectedSlot?.start === sl.start;
                  return (
                    <button key={i} className="slot-btn"
                      onClick={() => setSelectedSlot(sl)}
                      style={{
                        ...s.slotBtn,
                        background: sel ? "#6366f1" : "#fff",
                        color: sel ? "#fff" : "#1a1a2e",
                        border: `1.5px solid ${sel ? "#6366f1" : "#e4e4f0"}`,
                        boxShadow: sel ? "0 4px 16px rgba(99,102,241,0.25)" : "none",
                        fontWeight: sel ? 600 : 500,
                      }}>
                      {fmtRange(sl.start, sl.end)}
                    </button>
                  );
                })}
              </div>
              <button className="primary-btn" disabled={!selectedSlot}
                style={{ ...s.primaryBtn, opacity: selectedSlot ? 1 : 0.4, marginTop: 24 }}
                onClick={() => goTo("details")}>
                Continue
              </button>
            </div>
          )}

          {/* DETAILS */}
          {step === "details" && (
            <div className="fade-up">
              <button className="back-btn" style={s.backBtn} onClick={() => goTo("time")}>← Back</button>
              <h2 style={s.cardTitle}>Your details</h2>
              <div style={s.summaryBox}>
                <div style={s.summaryRow}>
                  <span style={s.summaryIcon}>📅</span>
                  <span style={s.summaryText}>{fmtDate(selectedDate)}</span>
                </div>
                <div style={s.summaryRow}>
                  <span style={s.summaryIcon}>🕐</span>
                  <span style={s.summaryText}>{fmtRange(selectedSlot.start, selectedSlot.end)} · {CONFIG.SLOT_DURATION} min</span>
                </div>
              </div>

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
                  : <p style={s.hint}>A confirmation will be sent to this address</p>
                }
              </div>

              <div style={s.field}>
                <label style={s.label}>Notes <span style={{ color: "#aaa", fontWeight: 400 }}>(optional)</span></label>
                <textarea style={{ ...s.input, minHeight: 80, resize: "none" }}
                  placeholder="Topics to cover, questions, context…"
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              <button className="primary-btn" disabled={submitting}
                style={{ ...s.primaryBtn, opacity: submitting ? 0.7 : 1 }}
                onClick={submitBooking}>
                {submitting ? "Confirming…" : "Confirm booking"}
              </button>
            </div>
          )}

          {/* DONE */}
          {step === "done" && (
            <div className="fade-up" style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={s.successIcon}>✓</div>
              <h2 style={{ ...s.cardTitle, fontSize: 22, marginBottom: 6 }}>Booking confirmed</h2>
              <p style={{ ...s.cardSub, marginBottom: 28 }}>
                {fmtDate(selectedDate)} · {fmtRange(selectedSlot.start, selectedSlot.end)}
              </p>
              <div style={s.confirmBox} className="scale-in">
                {[
                  ["📧", `Confirmation sent to ${form.email}`],
                  ["⏰", "Reminder 24 hours before the meeting"],
                  ["📅", "Calendar invite included"],
                ].map(([icon, text]) => (
                  <div key={text} style={s.confirmRow}>
                    <span style={{ fontSize: 16 }}>{icon}</span>
                    <span style={s.confirmText}>{text}</span>
                  </div>
                ))}
                {booking?.meetLink && (
                  <div style={{ ...s.confirmRow, marginTop: 4, paddingTop: 16, borderTop: "1px solid #e8e8f4" }}>
                    <span style={{ fontSize: 16 }}>🎥</span>
                    <a href={booking.meetLink} target="_blank" rel="noreferrer" style={s.meetLink}>
                      Join Google Meet →
                    </a>
                  </div>
                )}
              </div>
              <button className="primary-btn"
                style={{ ...s.primaryBtn, background: "#f4f4f8", color: "#6366f1", boxShadow: "none", marginTop: 24 }}
                onClick={() => { setStep("date"); setSelectedDate(null); setSelectedSlot(null); setForm({ name: "", email: "", notes: "" }); setBooking(null); }}>
                Book another meeting
              </button>
            </div>
          )}
        </div>

        <p style={s.footer}>{CONFIG.BUSINESS_NAME} · Secure scheduling</p>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#f7f7fb", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px 80px", fontFamily: "'Inter', sans-serif" },
  wrap: { width: "100%", maxWidth: 540 },
  loadWrap: { display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 140, gap: 16 },
  spinner: { width: 32, height: 32, border: "3px solid #e4e4f0", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadText: { color: "#aaa", fontSize: 14, fontWeight: 500 },
  errorCard: { background: "#fff", borderRadius: 16, padding: "48px 32px", textAlign: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" },
  errorTitle: { fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 8, fontFamily: "'Sora', sans-serif" },
  errorSub: { color: "#888", fontSize: 14 },
  header: { marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 },
  headerLabel: { fontSize: 11, fontWeight: 600, color: "#6366f1", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: 800, color: "#0f0f1a", fontFamily: "'Sora', sans-serif", letterSpacing: "-0.5px" },
  stepTrack: { display: "flex", alignItems: "center", gap: 0 },
  stepItem: { display: "flex", alignItems: "center", gap: 6 },
  stepDot: { width: 22, height: 22, borderRadius: "50%", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepLabel: { fontSize: 11, whiteSpace: "nowrap" },
  stepLine: { width: 20, height: 1.5, margin: "0 6px", borderRadius: 1 },
  card: { background: "#fff", borderRadius: 20, padding: "32px 28px", boxShadow: "0 2px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)", marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: 700, color: "#0f0f1a", marginBottom: 4, fontFamily: "'Sora', sans-serif" },
  cardSub: { fontSize: 13, color: "#888", fontWeight: 400, marginBottom: 24 },
  dayGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 24 },
  dayBtn: { display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 4px", borderRadius: 12, cursor: "pointer", gap: 3, transition: "all 0.15s" },
  timeGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  slotBtn: { padding: "12px 8px", borderRadius: 10, cursor: "pointer", fontSize: 13, textAlign: "center", transition: "all 0.15s", letterSpacing: "0.3px" },
  primaryBtn: { width: "100%", padding: "14px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", boxShadow: "0 4px 16px rgba(99,102,241,0.2)", fontFamily: "'Inter', sans-serif", letterSpacing: "0.1px" },
  backBtn: { background: "none", border: "none", color: "#aaa", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0, marginBottom: 20, display: "block", fontFamily: "'Inter', sans-serif", transition: "color 0.15s" },
  summaryBox: { background: "#f7f7fb", borderRadius: 10, padding: "14px 16px", marginBottom: 24, display: "flex", flexDirection: "column", gap: 8 },
  summaryRow: { display: "flex", alignItems: "center", gap: 10 },
  summaryIcon: { fontSize: 14 },
  summaryText: { fontSize: 13, fontWeight: 500, color: "#1a1a2e" },
  field: { marginBottom: 18 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6, letterSpacing: "0.3px" },
  input: { width: "100%", padding: "11px 14px", background: "#fafafa", border: "1.5px solid #e4e4f0", borderRadius: 10, color: "#0f0f1a", fontSize: 14, fontFamily: "'Inter', sans-serif", fontWeight: 400, transition: "all 0.15s" },
  inputErr: { borderColor: "#ef4444", background: "#fff8f8" },
  errMsg: { color: "#ef4444", fontSize: 12, fontWeight: 500, marginTop: 5 },
  hint: { color: "#bbb", fontSize: 12, marginTop: 5 },
  successIcon: { width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 24px rgba(99,102,241,0.3)" },
  confirmBox: { background: "#f7f7fb", borderRadius: 12, padding: "20px", display: "flex", flexDirection: "column", gap: 12, textAlign: "left" },
  confirmRow: { display: "flex", alignItems: "center", gap: 12 },
  confirmText: { fontSize: 13, fontWeight: 500, color: "#444" },
  meetLink: { fontSize: 13, fontWeight: 600, color: "#6366f1", textDecoration: "none" },
  emptyBox: { background: "#f7f7fb", borderRadius: 10, padding: "16px", fontSize: 13, color: "#888", marginBottom: 20, textAlign: "center", lineHeight: 1.6 },
  footer: { textAlign: "center", fontSize: 11, color: "#ccc", fontWeight: 500, letterSpacing: "0.3px" },
};
