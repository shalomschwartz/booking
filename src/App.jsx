import { useState, useEffect, useRef } from "react";

const CONFIG = {
  BUSINESS_NAME: import.meta.env.VITE_BUSINESS_NAME || "Shalom AI Solutions",
  OWNER_NAME: import.meta.env.VITE_OWNER_NAME || "Your Name",
  SLOT_DURATION: parseInt(import.meta.env.VITE_SLOT_DURATION_MINS || "30"),
  ACCENT: import.meta.env.VITE_ACCENT_COLOR || '#111827',
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

const STEPS = ["pick", "details", "done"];

export default function App() {
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("pick");
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", notes: "" });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [booking, setBooking] = useState(null);
  const [nudgeTime, setNudgeTime] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });
  const monthCacheRef = useRef({});
  const continueRef = useRef(null);

  useEffect(() => {
    const monthStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}`;
    const autoSelect = (data) => {
      const firstAvail = data.days[0]?.date;
      if (firstAvail && (!selectedDate || !selectedDate.startsWith(monthStr))) {
        setSelectedDate(firstAvail);
        setSelectedSlot(null);
      }
    };

    if (monthCacheRef.current[monthStr]) {
      setAvailability(monthCacheRef.current[monthStr]);
      autoSelect(monthCacheRef.current[monthStr]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setAvailability(null);
    fetch(`/api/availability?month=${monthStr}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        monthCacheRef.current[monthStr] = data;
        setAvailability(data);
        autoSelect(data);
        // Silently prefetch next month in the background
        const next = new Date(currentMonth.year, currentMonth.month + 1, 1);
        const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
        if (!monthCacheRef.current[nextStr]) {
          fetch(`/api/availability?month=${nextStr}`)
            .then(r => r.json())
            .then(d => { if (!d.error) monthCacheRef.current[nextStr] = d; })
            .catch(() => {});
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [currentMonth]);

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

  const todayStr = new Date().toLocaleDateString('en-CA');
  const availSet = new Set(availability?.days?.map(d => d.date) || []);
  const allAvailMonths = [...new Set((availability?.days || []).map(d => d.date.substring(0, 7)))].sort();
  const calYear = currentMonth.year;
  const calMonth = currentMonth.month;
  const calFirstDay = new Date(calYear, calMonth, 1).getDay();
  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calCells = [...Array(calFirstDay).fill(null)];
  for (let d = 1; d <= calDaysInMonth; d++) {
    calCells.push(`${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  const calMonthStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
  const canPrevMonth = calMonthStr > todayStr.substring(0, 7);
  const canNextMonth = true;
  const calMonthName = new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (error) return (
    <div style={s.page}>
      <style>{globalStyles}</style>
      <Nav />
      <div style={s.centerWrap}>
        <div style={s.errorCard}>
          <div style={s.errorIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#DC2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 style={s.errorTitle}>Scheduling Unavailable</h3>
          <p style={s.errorSub}>Please contact us directly to book an appointment.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <style>{globalStyles}</style>
      <Nav />

      <main style={s.main}>
        <div style={s.container}>

          {step !== "done" && (
            <div style={s.pageHeader} className="ph">
              <p style={s.eyebrow}>
                <span style={s.eyebrowDot} />
                Schedule a session
              </p>
              <h1 style={s.pageTitle}>Book an Appointment</h1>
              <p style={s.pageSub}>{CONFIG.SLOT_DURATION}-minute session via Google Meet</p>
            </div>
          )}

          {step !== "done" && (
            <div style={s.stepperWrap} className="sw">
              {["Pick a slot", "Your details"].map((label, i) => (
                <div key={label} style={s.stepperItem}>
                  <div style={{
                    ...s.stepperCircle,
                    background: stepNum > i ? CONFIG.ACCENT : stepNum === i ? CONFIG.ACCENT : "transparent",
                    border: `2px solid ${stepNum >= i ? CONFIG.ACCENT : "#D1D5DB"}`,
                    color: stepNum >= i ? "#fff" : "#9CA3AF",
                  }}>
                    {stepNum > i ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6l2.5 2.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : i + 1}
                  </div>
                  <span style={{
                    fontSize: 13,
                    fontWeight: stepNum === i ? 600 : 400,
                    color: stepNum >= i ? CONFIG.ACCENT : "#9CA3AF",
                    whiteSpace: "nowrap",
                  }}>
                    {label}
                  </span>
                  {i < 1 && (
                    <div style={{
                      flex: 1,
                      height: 1,
                      background: stepNum > i ? CONFIG.ACCENT : "#E5E7EB",
                      minWidth: 24,
                      maxWidth: 56,
                    }} />
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{
            ...s.card,
            opacity: animating ? 0 : 1,
            transform: animating ? "translateY(8px)" : "translateY(0)",
            transition: "opacity 0.22s ease, transform 0.22s ease",
          }}>

            {/* PICK DATE & TIME */}
            {step === "pick" && (
              <div className="anim">
                <div style={s.cardHeader} className="ch">
                  <h2 style={s.cardTitle}>Select a date & time</h2>
                  <p style={s.cardSub}>Pick an available date, then choose your slot</p>
                </div>

                {loading && (
                  <div style={{ padding: "20px 36px 24px" }}>
                    <div className="skeleton-card" style={{ height: 290, borderRadius: 12, background: "#F3F4F6" }} />
                  </div>
                )}

                {!loading && availability.days.length === 0 && (
                  <div style={s.emptyBox}>No availability in the next 2 weeks. Please check back soon.</div>
                )}

                {!loading && availability.days.length > 0 && (
                  <>
                    {/* Calendar */}
                    <div style={s.calWrap} className="cal-wrap">
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                          <button
                            style={{ ...s.calNavBtn, opacity: canPrevMonth ? 1 : 0.3, cursor: canPrevMonth ? "pointer" : "default", width: "auto", padding: "0 12px", fontSize: 12, fontWeight: 600, color: "#374151" }}
                            onClick={() => canPrevMonth && setCurrentMonth(cm => { const d = new Date(cm.year, cm.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                          >
                            ← Prev
                          </button>
                          <span style={s.monthLabel}>{calMonthName}</span>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                            {(canPrevMonth || (selectedDate && selectedDate !== todayStr)) && (
                              <button
                                className="today-btn"
                                style={{ padding: "3px 10px", background: CONFIG.ACCENT, color: "#fff", border: "none", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}
                                onClick={() => {
                                  const n = new Date();
                                  setCurrentMonth({ year: n.getFullYear(), month: n.getMonth() });
                                  if (availSet.has(todayStr)) { setSelectedDate(todayStr); setSelectedSlot(null); }
                                }}
                              >
                                ↩ Today
                              </button>
                            )}
                            <button
                              style={{ ...s.calNavBtn, opacity: canNextMonth ? 1 : 0.3, cursor: canNextMonth ? "pointer" : "default", width: "auto", padding: "0 12px", fontSize: 12, fontWeight: 600, color: "#374151" }}
                              onClick={() => canNextMonth && setCurrentMonth(cm => { const d = new Date(cm.year, cm.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                            >
                              Next →
                            </button>
                          </div>
                        </div>
                      </div>
                      <div style={s.calGrid}>
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(h => (
                          <div key={h} style={s.calDayHeader}>{h}</div>
                        ))}
                        {calCells.map((cell, i) => {
                          if (!cell) return <div key={`e${i}`} />;
                          const isAvail = availSet.has(cell);
                          const isPast = cell < todayStr;
                          const isSel = selectedDate === cell;
                          const isToday = cell === todayStr;
                          const clickable = isAvail && !isPast;
                          return (
                            <div
                              key={cell}
                              className={`${clickable ? "cal-day" : ""}${isSel ? " cal-selected" : ""}`}
                              onClick={() => { if (clickable) { setSelectedDate(cell); setSelectedSlot(null); } }}
                              style={{
                                ...s.calCell,
                                background: isSel ? CONFIG.ACCENT : "transparent",
                                color: isSel ? "#fff" : isPast || !isAvail ? "#D1D5DB" : "#111827",
                                fontWeight: isSel || isToday ? 700 : 500,
                                cursor: clickable ? "pointer" : "default",
                              }}
                            >
                              {parseInt(cell.split('-')[2])}
                              {isToday && !isSel && (
                                <span style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: CONFIG.ACCENT }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Prompt when no date selected yet */}
                    {!selectedDate && (
                      <div style={s.selectDatePrompt} className="ssl">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="#9CA3AF" strokeWidth="1.4"/>
                          <path d="M4.5 1.5v2M9.5 1.5v2M1.5 5.5h11" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                        Select a date above to see available times
                      </div>
                    )}

                    {/* Slots — appear when date is selected */}
                    {selectedDate && (
                      <div className="anim">
                        <div style={{ ...s.slotsSectionTitle, justifyContent: "space-between" }} className="ssl">
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                              <circle cx="7" cy="7" r="5.5" stroke={CONFIG.ACCENT} strokeWidth="1.4"/>
                              <path d="M7 4v3l2 1.5" stroke={CONFIG.ACCENT} strokeWidth="1.4" strokeLinecap="round"/>
                            </svg>
                            {fmtDate(selectedDate)} — available times
                          </div>
                          {!selectedSlot && (
                            <span className="pick-time-hint" style={{ fontSize: 11, fontWeight: 600, color: CONFIG.ACCENT, background: `${CONFIG.ACCENT}15`, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
                              ↓ pick a time
                            </span>
                          )}
                        </div>
                        <div style={s.timeGrid} className="tg">
                          {slotsForDate.map((sl, i) => {
                            const sel = selectedSlot?.start === sl.start;
                            return (
                              <div
                                key={i}
                                className={`slot-pill${sel ? " slot-selected" : ""}`}
                                onClick={() => { setSelectedSlot(sl); setNudgeTime(false); setTimeout(() => continueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80); }}
                                style={{
                                  ...s.slotPill,
                                  background: sel ? CONFIG.ACCENT : "#F9FAFB",
                                  color: sel ? "#fff" : "#374151",
                                  border: `1.5px solid ${sel ? CONFIG.ACCENT : "#E5E7EB"}`,
                                  fontWeight: sel ? 600 : 500,
                                }}
                              >
                                {fmtRange(sl.start, sl.end)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div style={s.cardFooter} className="cf">
                  {nudgeTime && !selectedSlot && (
                    <p style={s.nudgeMsg}>{selectedDate ? "Please select a time to continue" : "Please select a date first"}</p>
                  )}
                  <div
                    ref={continueRef}
                    onMouseEnter={() => { if (!selectedSlot) setNudgeTime(true); }}
                    onMouseLeave={() => setNudgeTime(false)}
                  >
                    <button
                      className="btn-primary"
                      style={{ ...s.btnPrimary, opacity: selectedSlot ? 1 : 0.35 }}
                      disabled={loading}
                      onClick={() => { if (!selectedSlot) { setNudgeTime(true); return; } goTo("details"); }}
                    >
                      Continue
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 8 }}>
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DETAILS */}
            {step === "details" && (
              <div className="anim">
                <div style={s.cardHeader} className="ch">
                  <button className="btn-back" style={s.btnBack} onClick={() => goTo("pick")}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Back
                  </button>
                  <h2 style={s.cardTitle}>Your details</h2>
                  <p style={s.cardSub}>Almost done — just a couple more things</p>
                </div>

                <div style={s.summaryRow} className="sr">
                  <div style={s.summaryChip}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="#374151" strokeWidth="1.4"/>
                      <path d="M4.5 1.5v2M9.5 1.5v2M1.5 5.5h11" stroke="#374151" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    {fmtDate(selectedDate)}
                  </div>
                  <div style={s.summaryChip}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5.5" stroke="#374151" strokeWidth="1.4"/>
                      <path d="M7 4v3l2 1.5" stroke="#374151" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    {fmtRange(selectedSlot.start, selectedSlot.end)} · {CONFIG.SLOT_DURATION} min
                  </div>
                </div>

                <div style={s.formGrid} className="fg">
                  <div style={s.field}>
                    <label style={s.label}>Full name</label>
                    <input
                      style={{ ...s.input, ...(formErrors.name ? s.inputErr : {}) }}
                      placeholder="Jane Smith"
                      value={form.name}
                      autoFocus
                      onChange={(e) => { setForm(f => ({ ...f, name: e.target.value })); setFormErrors(fe => ({ ...fe, name: undefined })); }}
                    />
                    {formErrors.name && <p style={s.errMsg}>{formErrors.name}</p>}
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>Email address</label>
                    <input
                      style={{ ...s.input, ...(formErrors.email ? s.inputErr : {}) }}
                      type="email"
                      placeholder="jane@company.com"
                      value={form.email}
                      onChange={(e) => { setForm(f => ({ ...f, email: e.target.value })); setFormErrors(fe => ({ ...fe, email: undefined })); }}
                    />
                    {formErrors.email
                      ? <p style={s.errMsg}>{formErrors.email}</p>
                      : <p style={s.inputHint}>Confirmation sent here</p>
                    }
                  </div>
                  <div style={{ ...s.field, gridColumn: "1 / -1" }}>
                    <label style={s.label}>
                      Notes
                      <span style={{ color: "#9CA3AF", fontWeight: 400, marginLeft: 6 }}>optional</span>
                    </label>
                    <textarea
                      style={{ ...s.input, minHeight: 100, resize: "none" }}
                      placeholder="Topics to discuss, questions, or anything helpful to know beforehand…"
                      value={form.notes}
                      onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={s.cardFooter} className="cf">
                  <button
                    className="btn-primary"
                    disabled={submitting}
                    style={{ ...s.btnPrimary, opacity: submitting ? 0.7 : 1 }}
                    onClick={submitBooking}
                  >
                    {submitting ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                        <span style={s.btnSpinner} />
                        Confirming…
                      </span>
                    ) : "Confirm booking"}
                  </button>
                  <p style={s.secureNote}>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                      <rect x="2" y="6" width="10" height="7" rx="2" stroke="#9CA3AF" strokeWidth="1.4"/>
                      <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    Your information is secure and never shared
                  </p>
                </div>
              </div>
            )}

            {/* DONE */}
            {step === "done" && (
              <div className="anim dp" style={{ padding: "52px 40px 48px", textAlign: "center" }}>
                <div style={s.successRing}>
                  <div style={s.successCircle}>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <path d="M7 14l5 5L21 9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <h2 style={s.doneTitle}>You're booked!</h2>
                <p style={s.doneSub}>
                  Looking forward to meeting with you, <strong>{form.name}</strong> on <strong>{fmtDate(selectedDate)}</strong>.
                </p>

                <div style={s.confirmCard}>
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
                      <a href={booking.meetLink} target="_blank" rel="noreferrer" style={s.meetLink}>
                        Join Google Meet →
                      </a>
                    </div>
                  )}
                </div>

                <div style={s.emailBanner}>
                  A confirmation email has been sent to <strong>{form.email}</strong>
                </div>

                <button
                  className="btn-ghost-dark"
                  style={s.btnGhostDark}
                  onClick={() => { setStep("pick"); setSelectedDate(null); setSelectedSlot(null); setForm({ name: "", email: "", notes: "" }); setBooking(null); }}
                >
                  Schedule another appointment
                </button>
              </div>
            )}

          </div>

          <p style={s.footer}>
            © {new Date().getFullYear()} {CONFIG.BUSINESS_NAME}
          </p>
        </div>
      </main>
    </div>
  );
}

function Nav() {
  return (
    <header style={s.nav}>
      <div style={s.navInner}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={s.navLogo}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5L10 6h4.5L11 9l1.5 5L8 11.5 4.5 14 6 9 2.5 6H7z" fill="#fff"/>
            </svg>
          </div>
          <span style={s.navBrand}>{CONFIG.BUSINESS_NAME}</span>
        </div>
      </div>
    </header>
  );
}

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #F3F4F6; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes scaleUp { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } }
  @keyframes pulse-ring { 0% { transform: scale(0.95); opacity: 1; } 70% { transform: scale(1.15); opacity: 0; } 100% { transform: scale(1.15); opacity: 0; } }
  @keyframes shimmer { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
  .skeleton-card { animation: shimmer 1.4s ease-in-out infinite; }

  .anim { animation: fadeUp 0.28s cubic-bezier(0.22,1,0.36,1) forwards; }
  .anim-scale { animation: scaleUp 0.32s cubic-bezier(0.22,1,0.36,1) forwards; }

  .day-card { transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s !important; cursor: pointer; }
  .day-card:not(.day-selected):hover { border-color: #6B7280 !important; transform: translateY(-2px) !important; box-shadow: 0 6px 18px rgba(0,0,0,0.08) !important; }

  .slot-pill { transition: border-color 0.15s, background 0.15s, transform 0.12s, box-shadow 0.15s !important; cursor: pointer; }
  .slot-pill:not(.slot-selected):hover { border-color: #6B7280 !important; background: #F3F4F6 !important; transform: translateY(-1px) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.07) !important; }

  .btn-primary { transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s !important; cursor: pointer; }
  .btn-primary:hover:not(:disabled) { opacity: 0.88 !important; transform: translateY(-1px) !important; box-shadow: 0 8px 24px rgba(17,24,39,0.28) !important; }
  .btn-primary:active:not(:disabled) { transform: translateY(0) !important; }

  .btn-back { transition: color 0.12s, background 0.12s !important; cursor: pointer; }
  .btn-back:hover { color: #111827 !important; background: #F3F4F6 !important; }

  .btn-ghost-dark { transition: background 0.15s, color 0.15s !important; cursor: pointer; }
  .btn-ghost-dark:hover { background: #F3F4F6 !important; }

  .cal-day { transition: background 0.1s, color 0.1s !important; border-radius: 8px; }
  .cal-day:not(.cal-selected):hover { background: #F3F4F6 !important; }
  .today-btn { transition: opacity 0.15s !important; }
  .today-btn:hover { opacity: 0.85 !important; }
  @keyframes slideInRight { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes nudgePulse { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(3px); } }
  .pick-time-hint { animation: slideInRight 0.35s cubic-bezier(0.22,1,0.36,1) forwards, nudgePulse 1.4s ease-in-out 0.5s infinite; display: inline-block; }

  @media (max-width: 600px) {
    .ph { margin-bottom: 20px !important; }
    .ph h1 { font-size: 24px !important; }
    .ph p { font-size: 14px !important; }
    .sw { gap: 6px !important; margin-bottom: 18px !important; }
    .sw span { font-size: 11px !important; }
    .ch { padding: 22px 20px 0 !important; }
    .cf { padding: 8px 20px 28px !important; }
    .dg { padding: 14px 20px !important; gap: 6px !important; }
    .tg { grid-template-columns: repeat(2, 1fr) !important; padding: 14px 20px !important; }
    .cal-wrap { padding: 14px 16px 8px !important; }
    .ssl { padding: 12px 16px 4px !important; }
    .sr { padding: 14px 20px 4px !important; }
    .fg { grid-template-columns: 1fr !important; padding: 14px 20px 8px !important; }
    .dp { padding: 36px 20px !important; }
  }

  input:focus, textarea:focus {
    outline: none !important;
    border-color: ${CONFIG.ACCENT} !important;
    box-shadow: 0 0 0 3px rgba(17,24,39,0.08) !important;
    background: #fff !important;
  }
  input::placeholder, textarea::placeholder { color: #D1D5DB; }
`;

const s = {
  page: { minHeight: "100vh", background: "#F3F4F6", fontFamily: "'Inter', sans-serif" },
  nav: { position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid #E5E7EB" },
  navInner: { maxWidth: 1100, margin: "0 auto", padding: "0 32px", height: 64, display: "flex", alignItems: "center" },
  navLogo: { width: 32, height: 32, borderRadius: 8, background: CONFIG.ACCENT, display: "flex", alignItems: "center", justifyContent: "center" },
  navBrand: { fontSize: 15, fontWeight: 600, color: CONFIG.ACCENT, letterSpacing: "-0.2px" },

  main: { padding: "52px 16px 80px" },
  container: { maxWidth: 600, margin: "0 auto" },

  loadWrap: { display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 120, gap: 16 },
  spinnerRing: { width: 36, height: 36, border: "2.5px solid #E5E7EB", borderTop: "2.5px solid #111827", borderRadius: "50%", animation: "spin 0.75s linear infinite" },
  loadText: { fontSize: 15, color: "#6B7280", fontWeight: 500 },

  centerWrap: { display: "flex", justifyContent: "center", paddingTop: 80 },
  errorCard: { background: "#fff", borderRadius: 20, padding: "52px 44px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.06)", maxWidth: 400 },
  errorIcon: { width: 52, height: 52, borderRadius: "50%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" },
  errorTitle: { fontSize: 19, fontWeight: 700, color: CONFIG.ACCENT, marginBottom: 10 },
  errorSub: { fontSize: 15, color: "#6B7280", lineHeight: 1.7 },

  pageHeader: { textAlign: "center", marginBottom: 32 },
  eyebrow: { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 14 },
  eyebrowDot: { width: 6, height: 6, borderRadius: "50%", background: "#22C55E", display: "inline-block" },
  pageTitle: { fontSize: 34, fontWeight: 700, color: CONFIG.ACCENT, letterSpacing: "-0.7px", marginBottom: 10, lineHeight: 1.15 },
  pageSub: { fontSize: 15, color: "#6B7280", fontWeight: 400 },

  stepperWrap: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 28, flexWrap: "wrap" },
  stepperItem: { display: "flex", alignItems: "center", gap: 10 },
  stepperCircle: { width: 28, height: 28, borderRadius: "50%", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" },

  card: { background: "#fff", borderRadius: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 8px 40px rgba(0,0,0,0.06)", overflow: "hidden" },
  cardHeader: { padding: "36px 36px 0" },
  cardTitle: { fontSize: 20, fontWeight: 700, color: CONFIG.ACCENT, marginBottom: 4, letterSpacing: "-0.3px" },
  cardSub: { fontSize: 14, color: "#6B7280", fontWeight: 400, lineHeight: 1.5 },
  cardFooter: { padding: "8px 36px 36px", display: "flex", flexDirection: "column", gap: 12 },

  dayGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, padding: "24px 36px" },
  dayCard: { display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 6px", borderRadius: 12, gap: 4 },

  timeGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, padding: "24px 36px" },
  slotPill: { padding: "14px 10px", borderRadius: 10, fontSize: 14, textAlign: "center", letterSpacing: "0.1px" },

  summaryRow: { display: "flex", gap: 8, padding: "20px 36px 4px", flexWrap: "wrap" },
  summaryChip: { display: "inline-flex", alignItems: "center", gap: 6, background: "#F9FAFB", color: "#374151", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 13px", fontSize: 13, fontWeight: 500 },

  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "16px 36px 8px" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#374151" },
  input: { padding: "12px 14px", background: "#F9FAFB", border: "1.5px solid #E5E7EB", borderRadius: 10, color: CONFIG.ACCENT, fontSize: 14, fontFamily: "'Inter', sans-serif", fontWeight: 400, transition: "all 0.15s" },
  inputErr: { borderColor: "#EF4444", background: "#FFF8F8" },
  errMsg: { fontSize: 12, color: "#EF4444", fontWeight: 500 },
  inputHint: { fontSize: 12, color: "#9CA3AF" },

  btnPrimary: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "15px 24px", background: CONFIG.ACCENT, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: "'Inter', sans-serif", boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 4px 16px rgba(17,24,39,0.16)", letterSpacing: "-0.1px" },
  btnSpinner: { width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.65s linear infinite", display: "inline-block" },
  btnBack: { background: "transparent", border: "none", color: "#6B7280", fontSize: 13, fontWeight: 500, fontFamily: "'Inter', sans-serif", padding: "6px 10px 6px 6px", borderRadius: 6, marginBottom: 18, display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" },
  btnGhostDark: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "14px 24px", background: "transparent", color: "#374151", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "'Inter', sans-serif" },

  secureNote: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: "#9CA3AF", fontWeight: 400 },
  nudgeMsg: { fontSize: 13, color: "#374151", fontWeight: 500, textAlign: "center", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 16px" },

  successRing: { width: 88, height: 88, borderRadius: "50%", background: "rgba(17,24,39,0.06)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" },
  successCircle: { width: 64, height: 64, borderRadius: "50%", background: CONFIG.ACCENT, display: "flex", alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 28, fontWeight: 700, color: CONFIG.ACCENT, marginBottom: 10, letterSpacing: "-0.5px" },
  doneSub: { fontSize: 15, color: "#6B7280", marginBottom: 32, lineHeight: 1.6 },

  confirmCard: { background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 14, overflow: "hidden", marginBottom: 16, textAlign: "left" },
  confirmCardHeader: { background: "#F3F4F6", padding: "12px 22px", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "1px" },
  confirmRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 22px", borderBottom: "1px solid #E5E7EB" },
  confirmLabel: { fontSize: 13, color: "#6B7280", fontWeight: 500 },
  confirmVal: { fontSize: 14, color: CONFIG.ACCENT, fontWeight: 600, textAlign: "right", maxWidth: "60%" },
  meetLink: { fontSize: 14, fontWeight: 600, color: CONFIG.ACCENT, textDecoration: "none", borderBottom: "1.5px solid #111827", paddingBottom: 1 },

  emailBanner: { background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "13px 18px", marginBottom: 20, fontSize: 13, color: "#166534", fontWeight: 500, lineHeight: 1.6 },
  emptyBox: { background: "#F9FAFB", border: "1.5px dashed #E5E7EB", borderRadius: 12, padding: "32px", fontSize: 14, color: "#9CA3AF", textAlign: "center", margin: "0 36px 24px", lineHeight: 1.7 },

  calWrap: { padding: "20px 36px 8px" },
  monthNav: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  monthLabel: { fontSize: 15, fontWeight: 700, color: "#111827", letterSpacing: "-0.2px" },
  calNavBtn: { width: 32, height: 32, borderRadius: 8, background: "#F9FAFB", border: "1.5px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontFamily: "'Inter', sans-serif", cursor: "pointer" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 },
  calDayHeader: { height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.3px" },
  calCell: { height: 38, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, fontSize: 14, userSelect: "none", position: "relative" },
  slotsSectionTitle: { display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "#374151", padding: "16px 36px 4px" },
  selectDatePrompt: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#9CA3AF", padding: "14px 36px 20px", fontWeight: 500 },
  footer: { textAlign: "center", fontSize: 12, color: "#9CA3AF", marginTop: 24 },
};
