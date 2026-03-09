import { useState, useEffect } from "react";

const CONFIG = {
  BUSINESS_NAME: import.meta.env.VITE_BUSINESS_NAME || "Your Business",
  OWNER_NAME: import.meta.env.VITE_OWNER_NAME || "Your Name",
  SLOT_DURATION: parseInt(import.meta.env.VITE_SLOT_DURATION_MINS || "60"),
};

const pad = (n) => String(n).padStart(2, "0");
const fmt12 = (isoString) => {
  const d = new Date(isoString);
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${ampm}`;
};
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
    setTimeout(() => { setStep(nextStep); setAnimating(false); }, 180);
  };

  const slotsForDate = selectedDate
    ? availability?.days?.find((d) => d.date === selectedDate)?.slots || []
    : [];

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "What's your name?";
    if (!form.email.trim()) errs.email = "Need your email for the confirmation";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "That email doesn't look right";
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
      goTo("done");
    } catch (e) {
      alert("Something went wrong, please try again!");
    }
    setSubmitting(false);
  };

  const stepNum = STEPS.indexOf(step);

  if (loading) return (
    <div style={s.page}>
      <div style={s.loadWrap}>
        <div style={s.bouncer}>
          <span style={{ ...s.dot, animationDelay: "0s" }} />
          <span style={{ ...s.dot, animationDelay: "0.15s" }} />
          <span style={{ ...s.dot, animationDelay: "0.3s" }} />
        </div>
        <p style={s.loadText}>Finding open slots…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.errorCard}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>😔</div>
          <h2 style={s.errorTitle}>Booking is offline right now</h2>
          <p style={s.errorSub}>Please reach out directly to schedule.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1.0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes wiggle { 0%,100%{transform:rotate(0deg)} 20%{transform:rotate(-8deg)} 40%{transform:rotate(8deg)} 60%{transform:rotate(-5deg)} 80%{transform:rotate(5deg)} }
        @keyframes popIn { 0%{transform:scale(0.9);opacity:0} 100%{transform:scale(1);opacity:1} }
        .fade-up { animation: fadeUp 0.22s ease forwards; }
        .wiggle { animation: wiggle 0.6s ease 0.1s; }
        .pop-in { animation: popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .day-pill { transition: all 0.15s ease !important; }
        .day-pill:hover { transform: translateY(-3px) !important; box-shadow: 0 6px 16px rgba(99,102,241,0.18) !important; }
        .slot-pill { transition: all 0.12s ease !important; }
        .slot-pill:hover { transform: scale(1.04) !important; }
        .go-btn:hover:not(:disabled) { transform: translateY(-2px) !important; box-shadow: 0 8px 24px rgba(99,102,241,0.4) !important; }
        .go-btn:active:not(:disabled) { transform: scale(0.97) !important; }
        input:focus, textarea:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 4px rgba(99,102,241,0.12) !important; background: #fff !important; }
      `}</style>

      <div style={s.wrap}>
        <div style={s.header}>
          <span style={s.logoText}>{CONFIG.BUSINESS_NAME}</span>
          {step !== "done" && (
            <div style={s.pills}>
              {["Date", "Time", "You"].map((label, i) => (
                <div key={label} style={{
                  ...s.pill,
                  background: stepNum > i ? "#6366f1" : stepNum === i ? "#fff" : "#efefef",
                  color: stepNum > i ? "#fff" : stepNum === i ? "#6366f1" : "#bbb",
                  border: stepNum === i ? "2px solid #6366f1" : "2px solid transparent",
                  fontWeight: stepNum === i ? 900 : 700,
                  transform: stepNum === i ? "scale(1.08)" : "scale(1)",
                }}>
                  {stepNum > i ? "✓" : label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ ...s.card, opacity: animating ? 0 : 1, transition: "opacity 0.18s" }}>

          {step === "date" && (
            <div className="fade-up">
              <div style={s.emojiWrap} className="wiggle">📅</div>
              <h1 style={s.h1}>When works for you?</h1>
              <p style={s.p}>Tap any open day — takes 60 seconds total ⚡</p>
              <div style={s.dayGrid}>
                {availability.days.map((d) => {
                  const sel = selectedDate === d.date;
                  const { wk, day, mon } = fmtShort(d.date);
                  return (
                    <button key={d.date} className="day-pill"
                      onClick={() => { setSelectedDate(d.date); setSelectedSlot(null); }}
                      style={{
                        ...s.dayPill,
                        background: sel ? "#6366f1" : "#fff",
                        color: sel ? "#fff" : "#1a1a2e",
                        border: `2px solid ${sel ? "#6366f1" : "#e4e4f0"}`,
                        boxShadow: sel ? "0 6px 20px rgba(99,102,241,0.35)" : "0 2px 8px rgba(0,0,0,0.05)",
                        transform: sel ? "translateY(-3px)" : "translateY(0)",
                      }}>
                      <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.65, textTransform: "uppercase", letterSpacing: 1 }}>{wk}</span>
                      <span style={{ fontSize: 22, fontWeight: 900 }}>{day}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.65 }}>{mon}</span>
                    </button>
                  );
                })}
              </div>
              {availability.days.length === 0 && (
                <div style={s.emptyState}>😅 No open slots right now — check back soon!</div>
              )}
              <button className="go-btn" disabled={!selectedDate}
                style={{ ...s.goBtn, opacity: selectedDate ? 1 : 0.35 }}
                onClick={() => goTo("time")}>
                See available times →
              </button>
            </div>
          )}

          {step === "time" && (
            <div className="fade-up">
              <button style={s.backBtn} onClick={() => goTo("date")}>← Back</button>
              <div style={s.emojiWrap} className="wiggle">🕐</div>
              <h1 style={s.h1}>Pick your time</h1>
              <p style={s.p}>{fmtDate(selectedDate)}</p>
              <div style={s.timeGrid}>
                {slotsForDate.map((sl, i) => {
                  const sel = selectedSlot?.start === sl.start;
                  return (
                    <button key={i} className="slot-pill"
                      onClick={() => setSelectedSlot(sl)}
                      style={{
                        ...s.slotPill,
                        background: sel ? "#6366f1" : "#fff",
                        color: sel ? "#fff" : "#1a1a2e",
                        border: `2px solid ${sel ? "#6366f1" : "#e4e4f0"}`,
                        boxShadow: sel ? "0 4px 16px rgba(99,102,241,0.3)" : "0 2px 8px rgba(0,0,0,0.05)",
                        fontWeight: sel ? 900 : 700,
                      }}>
                      {fmt12(sl.start)}
                    </button>
                  );
                })}
              </div>
              <button className="go-btn" disabled={!selectedSlot}
                style={{ ...s.goBtn, opacity: selectedSlot ? 1 : 0.35, marginTop: 20 }}
                onClick={() => goTo("details")}>
                Continue →
              </button>
            </div>
          )}

          {step === "details" && (
            <div className="fade-up">
              <button style={s.backBtn} onClick={() => goTo("time")}>← Back</button>
              <div style={s.emojiWrap} className="wiggle">👋</div>
              <h1 style={s.h1}>Almost there!</h1>
              <div style={s.slotBadge}>
                ✅ {fmtDate(selectedDate)} at {fmt12(selectedSlot.start)}
              </div>
              <div style={s.field}>
                <label style={s.label}>Your name</label>
                <input style={{ ...s.input, ...(formErrors.name ? s.inputErr : {}) }}
                  placeholder="e.g. Jane Smith" value={form.name} autoFocus
                  onChange={(e) => { setForm(f => ({ ...f, name: e.target.value })); setFormErrors(fe => ({ ...fe, name: undefined })); }} />
                {formErrors.name && <p style={s.errTxt}>👆 {formErrors.name}</p>}
              </div>
              <div style={s.field}>
                <label style={s.label}>Your email</label>
                <input style={{ ...s.input, ...(formErrors.email ? s.inputErr : {}) }}
                  type="email" placeholder="e.g. jane@gmail.com" value={form.email}
                  onChange={(e) => { setForm(f => ({ ...f, email: e.target.value })); setFormErrors(fe => ({ ...fe, email: undefined })); }} />
                {formErrors.email
                  ? <p style={s.errTxt}>👆 {formErrors.email}</p>
                  : <p style={s.inputHint}>📧 Confirmation sent here automatically</p>
                }
              </div>
              <div style={s.field}>
                <label style={s.label}>Anything to know? <span style={{ fontWeight: 600, opacity: 0.45 }}>(totally optional)</span></label>
                <textarea style={{ ...s.input, minHeight: 70, resize: "none" }}
                  placeholder="Questions, topics, special requests…" value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <button className="go-btn" disabled={submitting}
                style={{ ...s.goBtn, opacity: submitting ? 0.65 : 1 }}
                onClick={submitBooking}>
                {submitting ? "Locking in your spot… ✨" : "Book my appointment 🎉"}
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="fade-up" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 12 }} className="wiggle">🎉</div>
              <h1 style={{ ...s.h1, fontSize: 30 }}>You're all set!</h1>
              <p style={{ ...s.p, fontSize: 16, marginBottom: 24 }}>
                See you <strong>{fmtDate(selectedDate)}</strong><br />
                at <strong>{fmt12(selectedSlot.start)}</strong>
              </p>
              <div style={s.confirmCard} className="pop-in">
                {[
                  ["📧", `Confirmation sent to ${form.email}`],
                  ["⏰", "Reminder 24 hours before"],
                  ["📅", "Calendar invite included"],
                ].map(([icon, text]) => (
                  <div key={text} style={s.confirmRow}>
                    <span style={{ fontSize: 20 }}>{icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#444" }}>{text}</span>
                  </div>
                ))}
              </div>
              <button className="go-btn"
                style={{ ...s.goBtn, background: "#f0f0ff", color: "#6366f1", boxShadow: "none", marginTop: 24 }}
                onClick={() => { setStep("date"); setSelectedDate(null); setSelectedSlot(null); setForm({ name: "", email: "", notes: "" }); }}>
                Book another slot
              </button>
            </div>
          )}
        </div>

        <p style={s.footer}>⚡ Takes under 60 seconds · Powered by {CONFIG.BUSINESS_NAME}</p>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "linear-gradient(145deg, #eef0ff 0%, #f9f9ff 40%, #fff0fa 100%)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px 80px", fontFamily: "'Nunito', sans-serif" },
  wrap: { width: "100%", maxWidth: 520 },
  loadWrap: { display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 120, gap: 16 },
  bouncer: { display: "flex", gap: 7 },
  dot: { width: 11, height: 11, borderRadius: "50%", background: "#6366f1", display: "inline-block", animation: "bounce 1.2s infinite ease-in-out both" },
  loadText: { color: "#888", fontSize: 15, fontWeight: 700 },
  errorCard: { background: "#fff", borderRadius: 24, padding: "48px 32px", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  errorTitle: { fontSize: 20, fontWeight: 900, color: "#1a1a2e", marginBottom: 8 },
  errorSub: { color: "#888", fontSize: 15, fontWeight: 600 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, padding: "0 2px" },
  logoText: { fontSize: 18, fontWeight: 900, color: "#1a1a2e", letterSpacing: "-0.4px" },
  pills: { display: "flex", gap: 6 },
  pill: { padding: "4px 13px", borderRadius: 20, fontSize: 12, transition: "all 0.2s ease" },
  card: { background: "#fff", borderRadius: 28, padding: "32px 28px", boxShadow: "0 8px 48px rgba(99,102,241,0.1), 0 2px 8px rgba(0,0,0,0.04)", marginBottom: 14 },
  emojiWrap: { fontSize: 46, lineHeight: 1, marginBottom: 10, display: "inline-block" },
  h1: { fontSize: 26, fontWeight: 900, color: "#1a1a2e", marginBottom: 6, letterSpacing: "-0.5px" },
  p: { fontSize: 15, color: "#999", fontWeight: 700, marginBottom: 22 },
  dayGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 22 },
  dayPill: { display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 2px", borderRadius: 16, cursor: "pointer", gap: 2 },
  timeGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 4 },
  slotPill: { padding: "15px 8px", borderRadius: 14, cursor: "pointer", fontSize: 15, textAlign: "center" },
  goBtn: { width: "100%", padding: "16px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 900, cursor: "pointer", boxShadow: "0 4px 18px rgba(99,102,241,0.28)", fontFamily: "'Nunito', sans-serif", letterSpacing: "-0.2px" },
  backBtn: { background: "none", border: "none", color: "#bbb", fontSize: 14, fontWeight: 800, cursor: "pointer", marginBottom: 14, fontFamily: "'Nunito', sans-serif", padding: 0, display: "block" },
  slotBadge: { background: "#f0f0ff", color: "#6366f1", borderRadius: 12, padding: "11px 16px", fontSize: 14, fontWeight: 800, marginBottom: 22 },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 13, fontWeight: 900, color: "#1a1a2e", marginBottom: 7 },
  input: { width: "100%", padding: "13px 16px", background: "#f8f8ff", border: "2px solid #e4e4f0", borderRadius: 12, color: "#1a1a2e", fontSize: 15, fontFamily: "'Nunito', sans-serif", fontWeight: 700, transition: "all 0.15s" },
  inputErr: { borderColor: "#ff4d6d", background: "#fff5f7" },
  errTxt: { color: "#ff4d6d", fontSize: 13, fontWeight: 800, marginTop: 5 },
  inputHint: { color: "#bbb", fontSize: 12, fontWeight: 700, marginTop: 5 },
  confirmCard: { background: "#f8f8ff", borderRadius: 18, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 },
  confirmRow: { display: "flex", alignItems: "center", gap: 12, textAlign: "left" },
  emptyState: { background: "#fff8ed", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 800, color: "#f59e0b", marginBottom: 16, textAlign: "center" },
  footer: { textAlign: "center", fontSize: 12, color: "#ccc", fontWeight: 700 },
};
