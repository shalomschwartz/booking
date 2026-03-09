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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        @keyframes shimmer { 0%{opacity:0.6} 50%{opacity:1} 100%{opacity:0.6} }
        .fade-up { animation: fadeUp 0.28s cubic-bezier(0.22,1,0.36,1) forwards; }
        .scale-in { animation: scaleIn 0.32s cubic-bezier(0.22,1,0.36,1) forwards; }
        .day-btn:hover { background: #2a2a2a !important; border-color: #c9a84c !important; }
        .slot-btn:hover { background: #2a2a2a !important; border-color: #c9a84c !important; color: #fff !important; }
        .primary-btn:hover:not(:disabled) { background: #c9a84c !important; color: #0a0a0a !important; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(201,168,76,0.35) !important; }
        .primary-btn:active:not(:disabled) { transform: translateY(0) !important; }
        .ghost-btn:hover { color: #c9a84c !important; }
        input:focus, textarea:focus { outline: none !important; border-color: #c9a84c !important; box-shadow: 0 0 0 3px rgba(201,168,76,0.12) !important; }
      `}</style>

      <div style={s.wrap}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.goldBar} />
          <p style={s.eyebrow}>Schedule a meeting</p>
          <h1 style={s.brandName}>{CONFIG.BUSINESS_NAME}</h1>
          {step !== "done" && (
            <div style={s.steps}>
              {["Date", "Time", "Details"].map((label, i) => (
                <div key={label} style={s.stepItem}>
                  <div style={{
                    ...s.stepDot,
                    background: stepNum > i ? "#c9a84c" : stepNum === i ? "transparent" : "transparent",
                    border: stepNum > i ? "1.5px solid #c9a84c" : stepNum === i ? "1.5px solid #c9a84c" : "1.5px solid #333",
                    color: stepNum > i ? "#0a0a0a" : stepNum === i ? "#c9a84c" : "#444",
                  }}>
                    {stepNum > i ? "✓" : i + 1}
                  </div>
                  <span style={{ ...s.stepLabel, color: stepNum === i ? "#c9a84c" : stepNum > i ? "#666" : "#444" }}>
                    {label}
                  </span>
                  {i < 2 && <div style={{ ...s.stepLine, background: stepNum > i ? "#c9a84c" : "#2a2a2a" }} />}
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
                        background: sel ? "#c9a84c" : "#1a1a1a",
                        color: sel ? "#0a0a0a" : "#ccc",
                        border: `1.5px solid ${sel ? "#c9a84c" : "#2e2e2e"}`,
                        boxShadow: sel ? "0 4px 20px rgba(201,168,76,0.3)" : "none",
                      }}>
                      <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>{wk}</span>
                      <span style={{ fontSize: 20, fontWeight: 600 }}>{day}</span>
                      <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.7 }}>{mon}</span>
                    </button>
                  );
                })}
              </div>
              {availability.days.length === 0 && (
                <div style={s.emptyBox}>No availability in the next 2 weeks. Please check back soon.</div>
              )}
              <button className="primary-btn" disabled={!selectedDate}
                style={{ ...s.primaryBtn, opacity: selectedDate ? 1 : 0.35 }}
                onClick={() => goTo("time")}>
                Continue →
              </button>
            </div>
          )}

          {/* TIME */}
          {step === "time" && (
            <div className="fade-up">
              <button className="ghost-btn" style={s.ghostBtn} onClick={() => goTo("date")}>← Back</button>
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
                        background: sel ? "#c9a84c" : "#1a1a1a",
                        color: sel ? "#0a0a0a" : "#ccc",
                        border: `1.5px solid ${sel ? "#c9a84c" : "#2e2e2e"}`,
                        boxShadow: sel ? "0 4px 20px rgba(201,168,76,0.3)" : "none",
                        fontWeight: sel ? 600 : 400,
                      }}>
                      {fmtRange(sl.start, sl.end)}
                    </button>
                  );
                })}
              </div>
              <button className="primary-btn" disabled={!selectedSlot}
                style={{ ...s.primaryBtn, opacity: selectedSlot ? 1 : 0.35, marginTop: 28 }}
                onClick={() => goTo("details")}>
                Continue →
              </button>
            </div>
          )}

          {/* DETAILS */}
          {step === "details" && (
            <div className="fade-up">
              <button className="ghost-btn" style={s.ghostBtn} onClick={() => goTo("time")}>← Back</button>
              <h2 style={s.cardTitle}>Your details</h2>
              <div style={s.summaryBox}>
                <div style={s.summaryRow}>
                  <span style={s.summaryDot} />
                  <span style={s.summaryText}>{fmtDate(selectedDate)}</span>
                </div>
                <div style={s.summaryRow}>
                  <span style={s.summaryDot} />
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
                <label style={s.label}>Notes <span style={{ color: "#444", fontWeight: 400 }}>(optional)</span></label>
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
            <div className="fade-up" style={{ textAlign: "center" }}>
              <div style={s.successRing}>
                <div style={s.successInner}>✓</div>
              </div>
              <h2 style={{ ...s.cardTitle, fontSize: 22, marginBottom: 6 }}>Booking confirmed</h2>
              <p style={{ ...s.cardSub, marginBottom: 28 }}>
                {fmtDate(selectedDate)} · {fmtRange(selectedSlot.start, selectedSlot.end)}
              </p>
              <div style={s.confirmBox} className="scale-in">
                {[
                  ["Confirmation sent to", form.email],
                  ["Reminder", "24 hours before the meeting"],
                  ["Calendar invite", "included in your email"],
                ].map(([label, val]) => (
                  <div key={label} style={s.confirmRow}>
                    <span style={s.confirmDot} />
                    <span style={s.confirmText}><span style={{ color: "#888" }}>{label} </span>{val}</span>
                  </div>
                ))}
                {booking?.meetLink && (
                  <div style={{ ...s.confirmRow, paddingTop: 14, marginTop: 6, borderTop: "1px solid #2a2a2a" }}>
                    <span style={s.confirmDot} />
                    <a href={booking.meetLink} target="_blank" rel="noreferrer" style={s.meetLink}>
                      Join Google Meet →
                    </a>
                  </div>
                )}
              </div>
              <button className="primary-btn"
                style={{ ...s.primaryBtn, background: "transparent", color: "#c9a84c", border: "1.5px solid #c9a84c", boxShadow: "none", marginTop: 24 }}
                onClick={() => { setStep("date"); setSelectedDate(null); setSelectedSlot(null); setForm({ name: "", email: "", notes: "" }); setBooking(null); }}>
                Schedule another meeting
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
  page: { minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px 80px", fontFamily: "'Inter', sans-serif" },
  wrap: { width: "100%", maxWidth: 520 },
  loadWrap: { display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 140, gap: 16 },
  spinner: { width: 28, height: 28, border: "2px solid #2a2a2a", borderTop: "2px solid #c9a84c", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadText: { color: "#444", fontSize: 13, fontWeight: 400 },
  errorCard: { background: "#141414", borderRadius: 16, padding: "48px 32px", textAlign: "center", border: "1px solid #222" },
  errorTitle: { fontSize: 17, fontWeight: 600, color: "#e0e0e0", marginBottom: 8, fontFamily: "'Playfair Display', serif" },
  errorSub: { color: "#555", fontSize: 13 },
  header: { marginBottom: 24 },
  goldBar: { width: 28, height: 2, background: "#c9a84c", marginBottom: 14, borderRadius: 1 },
  eyebrow: { fontSize: 10, fontWeight: 600, color: "#c9a84c", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 6 },
  brandName: { fontSize: 24, fontWeight: 700, color: "#f0f0f0", fontFamily: "'Playfair Display', serif", letterSpacing: "-0.3px", marginBottom: 20 },
  steps: { display: "flex", alignItems: "center" },
  stepItem: { display: "flex", alignItems: "center", gap: 7 },
  stepDot: { width: 20, height: 20, borderRadius: "50%", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepLabel: { fontSize: 11, fontWeight: 500, letterSpacing: "0.3px" },
  stepLine: { width: 24, height: 1, margin: "0 8px" },
  card: { background: "#141414", borderRadius: 18, padding: "32px 28px", border: "1px solid #222", marginBottom: 16 },
  cardTitle: { fontSize: 19, fontWeight: 600, color: "#f0f0f0", marginBottom: 4, fontFamily: "'Playfair Display', serif", letterSpacing: "-0.2px" },
  cardSub: { fontSize: 12, color: "#555", fontWeight: 400, marginBottom: 24, letterSpacing: "0.2px" },
  dayGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 24 },
  dayBtn: { display: "flex", flexDirection: "column", alignItems: "center", padding: "11px 4px", borderRadius: 10, cursor: "pointer", gap: 3, transition: "all 0.15s" },
  timeGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  slotBtn: { padding: "12px 8px", borderRadius: 9, cursor: "pointer", fontSize: 13, textAlign: "center", transition: "all 0.15s", letterSpacing: "0.5px" },
  primaryBtn: { width: "100%", padding: "14px", background: "#c9a84c", color: "#0a0a0a", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", boxShadow: "0 4px 20px rgba(201,168,76,0.2)", fontFamily: "'Inter', sans-serif", letterSpacing: "0.3px" },
  ghostBtn: { background: "none", border: "none", color: "#555", fontSize: 12, fontWeight: 500, cursor: "pointer", padding: 0, marginBottom: 22, display: "block", fontFamily: "'Inter', sans-serif", transition: "color 0.15s", letterSpacing: "0.2px" },
  summaryBox: { background: "#0f0f0f", border: "1px solid #222", borderRadius: 10, padding: "14px 16px", marginBottom: 24, display: "flex", flexDirection: "column", gap: 10 },
  summaryRow: { display: "flex", alignItems: "center", gap: 10 },
  summaryDot: { width: 4, height: 4, borderRadius: "50%", background: "#c9a84c", flexShrink: 0 },
  summaryText: { fontSize: 13, fontWeight: 400, color: "#ccc" },
  field: { marginBottom: 18 },
  label: { display: "block", fontSize: 11, fontWeight: 500, color: "#666", marginBottom: 7, letterSpacing: "0.5px", textTransform: "uppercase" },
  input: { width: "100%", padding: "11px 14px", background: "#0f0f0f", border: "1px solid #2a2a2a", borderRadius: 9, color: "#e0e0e0", fontSize: 14, fontFamily: "'Inter', sans-serif", fontWeight: 400, transition: "all 0.15s" },
  inputErr: { borderColor: "#b04040" },
  errMsg: { color: "#b04040", fontSize: 11, fontWeight: 500, marginTop: 5 },
  hint: { color: "#444", fontSize: 11, marginTop: 5 },
  successRing: { width: 60, height: 60, borderRadius: "50%", border: "1.5px solid #c9a84c", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  successInner: { width: 44, height: 44, borderRadius: "50%", background: "#c9a84c", color: "#0a0a0a", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" },
  confirmBox: { background: "#0f0f0f", border: "1px solid #222", borderRadius: 12, padding: "20px", display: "flex", flexDirection: "column", gap: 12, textAlign: "left" },
  confirmRow: { display: "flex", alignItems: "center", gap: 12 },
  confirmDot: { width: 4, height: 4, borderRadius: "50%", background: "#c9a84c", flexShrink: 0 },
  confirmText: { fontSize: 13, color: "#ccc", fontWeight: 400 },
  meetLink: { fontSize: 13, fontWeight: 600, color: "#c9a84c", textDecoration: "none" },
  emptyBox: { background: "#0f0f0f", border: "1px solid #222", borderRadius: 10, padding: "16px", fontSize: 13, color: "#555", marginBottom: 20, textAlign: "center", lineHeight: 1.7 },
  footer: { textAlign: "center", fontSize: 11, color: "#333", fontWeight: 400, letterSpacing: "0.5px" },
};
