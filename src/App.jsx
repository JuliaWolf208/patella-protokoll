import { useState, useEffect } from "react";

const DAYS      = ["Mo","Di","Mi","Do","Fr","Sa","So"];
const FULL_DAYS = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];

const SECTIONS = [
  {
    id: "morgens", label: "Morgens", emoji: "☀️",
    items: [
      { id: "pendeln_m", text: "Pendeln – 5 Min. (sanfte Aktivierung)" },
      { id: "wandsitz",  text: "Wandsitz – 5× 45 Sek., 2 Min. Pause" },
    ],
    inputs: [
      { id: "winkel",           label: "Winkel",        unit: "°",   placeholder: "60" },
      { id: "schmerz_wandsitz", label: "Schmerz dabei", unit: "/10", placeholder: "0"  },
    ],
  },
  {
    id: "tag", label: "Über den Tag", emoji: "🔄",
    items: [
      { id: "pendeln_1",       text: "Pendeln (1. Mal)" },
      { id: "pendeln_2",       text: "Pendeln (2. Mal)" },
      { id: "pendeln_3",       text: "Pendeln (3. Mal)" },
      { id: "scheibenwischer", text: "Scheibenwischer – entspannt" },
      { id: "hochlagern",      text: "Beine hochlagern" },
    ],
  },
  {
    id: "huefte", label: "Hüftprogramm (2× pro Woche)", emoji: "🦵",
    items: [
      { id: "huefte_supersatz", text: "Supersatz: 15 Clamshells + 15 Beinheben, 2 Durchgänge pro Seite" },
      { id: "huefte_hipthrust", text: "Hipthrusts an der Couch – 2× 12–15, Po 2 Sek. fest" },
      { id: "huefte_4er",       text: "4er-Dehnung – 2 Min. pro Seite (Zehen zum Schienbein!)" },
    ],
  },
  {
    id: "abends", label: "Abends", emoji: "🌙",
    items: [
      { id: "faszie_quad", text: "Faszienrolle Quadrizeps – 2× pro Bein" },
      { id: "faszie_itb",  text: "Faszienrolle ITB/Außenseite – 1× pro Bein" },
      { id: "faszie_add",  text: "Faszienrolle Adduktoren – 1× pro Bein" },
      { id: "kuehlen",     text: "Kühlen – 15 Min. Kühlpack auf Patellasehne, Beine hochlagern" },
    ],
  },
];

const METRICS = [
  { id: "schmerz_aufstehen", label: "Schmerz Aufstehen", unit: "/10" },
  { id: "schmerz_treppe",    label: "Schmerz Treppe",    unit: "/10" },
  { id: "rad",               label: "Rad heute",          unit: "km"  },
];

const STORAGE_KEY     = "knie_protokoll_v2";
const OLD_STORAGE_KEY = "patella_protokoll_v1";

// ── Data helpers ───────────────────────────────────────────────────────────────

function emptyDay() {
  const checks = {};
  SECTIONS.forEach(s => s.items.forEach(i => (checks[i.id] = false)));
  const inputs = {};
  SECTIONS.forEach(s => (s.inputs || []).forEach(i => (inputs[i.id] = "")));
  METRICS.forEach(m => (inputs[m.id] = ""));
  return { checks, inputs, notes: "", date: "" };
}

function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMonday(dateStr) {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return localDateStr(d);
}

function weekDates(mondayStr) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayStr + "T00:00:00");
    d.setDate(d.getDate() + i);
    return localDateStr(d);
  });
}

function emptyWeek(mondayStr) {
  return {
    weekStart: mondayStr,
    days: Array.from({ length: 7 }, () => ({ ...emptyDay() })),
  };
}

function getKW(mondayStr) {
  const d = new Date(mondayStr + "T00:00:00");
  const thu = new Date(d);
  thu.setDate(d.getDate() + 3);
  const jan4 = new Date(thu.getFullYear(), 0, 4);
  return 1 + Math.round((thu - jan4) / (7 * 86400000));
}

function formatWeekRange(mondayStr) {
  const [mon, sun] = [weekDates(mondayStr)[0], weekDates(mondayStr)[6]];
  const s = new Date(mon + "T00:00:00");
  const e = new Date(sun + "T00:00:00");
  const f = (d, year) => d.toLocaleDateString("de-DE", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}) });
  return `${f(s)} – ${f(e, true)}`;
}

function todayStr() {
  return localDateStr(new Date());
}

function todayIndex() {
  return (new Date().getDay() + 6) % 7;
}

function ensureCurrentWeek(storageData) {
  const monday = getMonday();
  const idx = storageData.weeks.findIndex(w => w.weekStart === monday);
  if (idx === -1) {
    return { ...storageData, weeks: [...storageData.weeks, emptyWeek(monday)] };
  }
  return storageData;
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p?.weeks?.length > 0) return p;
    }
    // Migrate from v1
    const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
    if (oldRaw) {
      const old = JSON.parse(oldRaw);
      if (Array.isArray(old) && old.length === 7) {
        const monday = getMonday();
        const dates  = weekDates(monday);
        return { weeks: [{ weekStart: monday, days: old.map((d, i) => ({ ...d, date: d.date || dates[i] })) }] };
      }
    }
  } catch {}
  return { weeks: [emptyWeek(getMonday())] };
}

function saveToStorage(d) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {}
}

function buildExportText(storageData) {
  const lines = ["=== KNIE PROTOKOLL EXPORT ===", `Exportiert: ${new Date().toLocaleString("de-DE")}`, ""];
  storageData.weeks.forEach(week => {
    lines.push(`==== KW ${getKW(week.weekStart)} · ${formatWeekRange(week.weekStart)} ====`);
    week.days.forEach((day, i) => {
      const allChecks = SECTIONS.flatMap(sec => sec.items.map(item => day.checks[item.id]));
      const done = allChecks.filter(Boolean).length;
      const datePart = day.date ? " · " + new Date(day.date + "T00:00:00").toLocaleDateString("de-DE") : "";
      lines.push(`--- ${FULL_DAYS[i]}${datePart} (${done}/${allChecks.length}) ---`);
      SECTIONS.forEach(sec => {
        sec.items.forEach(item => lines.push(`  [${day.checks[item.id] ? "x" : " "}] ${item.text}`));
        (sec.inputs || []).forEach(inp => { if (day.inputs[inp.id]) lines.push(`  ${inp.label}: ${day.inputs[inp.id]} ${inp.unit}`); });
      });
      METRICS.forEach(m => { if (day.inputs[m.id]) lines.push(`  ${m.label}: ${day.inputs[m.id]} ${m.unit}`); });
      if (day.notes) lines.push(`  Notizen: ${day.notes}`);
      lines.push("");
    });
  });
  lines.push("=== ENDE ===");
  lines.push("RAW:" + JSON.stringify(storageData));
  return lines.join("\n");
}

function parseImport(text) {
  try {
    const m = text.match(/RAW:(.+)$/s);
    if (m) {
      const p = JSON.parse(m[1].trim());
      if (p?.weeks?.length > 0) return p;
      // Accept old 7-day format
      if (Array.isArray(p) && p.length === 7) {
        return { weeks: [{ weekStart: getMonday(), days: p }] };
      }
    }
  } catch {}
  return null;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const FONT_SANS  = "'DM Sans', 'Helvetica Neue', sans-serif";
const FONT_SERIF = "'Fraunces', Georgia, serif";

const palette = {
  bg0:       "#f0e8dd",
  bg1:       "#e4dccd",
  bg2:       "#d8d0c0",
  glass:     "rgba(255,255,255,0.50)",
  glassBdr:  "rgba(255,255,255,0.65)",
  sage:      "#7c947c",
  sageDark:  "#607860",
  sageLight: "rgba(124,148,124,0.18)",
  sageBdr:   "rgba(124,148,124,0.35)",
  sand:      "#a8896c",
  text:      "#3a3530",
  textMid:   "#6b5d48",
  textMute:  "#8a7d6e",
  warn:      "#a8896c",
  warnBg:    "rgba(168,137,108,0.12)",
  warnBdr:   "rgba(168,137,108,0.22)",
  red:       "#c0604a",
};

const S = {
  app: {
    minHeight: "100vh",
    background: `linear-gradient(180deg, ${palette.bg0} 0%, ${palette.bg1} 50%, ${palette.bg2} 100%)`,
    backgroundAttachment: "fixed",
    fontFamily: FONT_SANS,
    color: palette.text,
    paddingBottom: 48,
    position: "relative",
    overflow: "hidden",
  },
  blob1: { position:"fixed", top:-120, right:-120, width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle,rgba(168,140,108,0.18),transparent 70%)", pointerEvents:"none", zIndex:0 },
  blob2: { position:"fixed", bottom:160, left:-150, width:380, height:380, borderRadius:"50%", background:"radial-gradient(circle,rgba(124,148,124,0.14),transparent 70%)", pointerEvents:"none", zIndex:0 },
  inner: { position:"relative", zIndex:1, maxWidth:480, margin:"0 auto" },

  // Modal
  modal: { position:"fixed", inset:0, zIndex:200, background:"rgba(58,53,48,0.45)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 },
  modalBox: { width:"100%", maxWidth:420, background:palette.bg0, borderRadius:24, padding:28, border:`1px solid rgba(255,255,255,0.65)`, boxShadow:"0 30px 60px rgba(58,53,48,0.2)" },
  modalTitle: { fontFamily:FONT_SERIF, fontSize:20, fontWeight:400, color:palette.text, marginBottom:8 },
  modalSub:   { fontSize:13, color:palette.textMute, lineHeight:1.6, marginBottom:16 },
  ta: { width:"100%", boxSizing:"border-box", padding:"10px 14px", borderRadius:12, border:`1px solid rgba(168,137,108,0.3)`, background:"rgba(255,255,255,0.5)", color:palette.text, fontSize:11, fontFamily:"monospace", resize:"none", outline:"none" },

  // Buttons
  btn: (variant = "primary") => ({
    padding: "10px 20px", borderRadius: 50,
    border: variant === "primary" ? `1px solid ${palette.sage}` : variant === "danger" ? `1px solid ${palette.red}` : `1px solid rgba(168,137,108,0.4)`,
    background: variant === "primary" ? palette.sage : variant === "danger" ? palette.red : "rgba(255,255,255,0.45)",
    color: variant === "primary" || variant === "danger" ? "#f0e8dd" : palette.textMid,
    fontSize: 13, cursor: "pointer", fontFamily: FONT_SANS,
    backdropFilter: "blur(4px)", transition: "all 0.2s",
  }),

  // Header
  header: { padding:"32px 20px 0", textAlign:"center" },
  headerMeta: { fontSize:10, letterSpacing:3, textTransform:"uppercase", color:palette.textMute, marginBottom:10 },
  headerTitle: { fontFamily:FONT_SERIF, fontWeight:300, fontSize:40, color:palette.text, letterSpacing:"-0.8px", lineHeight:1.05, margin:0 },
  headerTitleEm: { fontStyle:"italic", color:palette.sage },
  savedFlash: (on) => ({ fontSize:11, letterSpacing:1.5, color: on ? palette.sage : "rgba(124,148,124,0.35)", marginTop:8, transition:"color 0.4s" }),
  headerBtns: { display:"flex", justifyContent:"center", gap:10, marginTop:16 },

  // Week navigation
  weekNav: { display:"flex", alignItems:"center", justifyContent:"center", gap:12, padding:"20px 20px 0" },
  weekNavBtn: (disabled) => ({
    width:32, height:32, borderRadius:"50%",
    border: `1px solid ${disabled ? "rgba(168,137,108,0.15)" : "rgba(168,137,108,0.4)"}`,
    background: disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.45)",
    color: disabled ? palette.textMute : palette.textMid,
    fontSize:14, cursor: disabled ? "default" : "pointer",
    backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center",
    opacity: disabled ? 0.35 : 1, transition:"all 0.2s",
  }),
  weekLabel: { textAlign:"center", flex:1 },
  weekKW:    { fontSize:15, fontFamily:FONT_SERIF, fontWeight:400, color:palette.text },
  weekRange: { fontSize:11, color:palette.textMute, letterSpacing:0.3, marginTop:1 },

  // Day picker
  dayPicker: { display:"flex", justifyContent:"center", gap:6, padding:"16px 16px 0", flexWrap:"wrap" },
  dayPill: (active) => ({
    width:40, height:56, borderRadius:20, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:5,
    border: active ? `1.5px solid ${palette.sage}` : `1px solid rgba(255,255,255,0.65)`,
    background: active ? palette.sage : "rgba(255,255,255,0.50)",
    backdropFilter:"blur(8px)",
    color: active ? "#f0e8dd" : palette.textMute, fontSize:11, cursor:"pointer",
    boxShadow: active ? `0 8px 20px rgba(124,148,124,0.3)` : "none",
    transition:"all 0.2s", position:"relative",
  }),
  todayDot: (active) => ({ position:"absolute", top:5, right:5, width:5, height:5, borderRadius:"50%", background: active ? "#f0e8dd" : palette.sage }),
  ring: (pct, active) => ({
    width:20, height:20, borderRadius:"50%",
    background:`conic-gradient(${active ? "#f0e8dd" : palette.sage} ${pct*3.6}deg, rgba(0,0,0,0.1) ${pct*3.6}deg)`,
    position:"relative",
  }),
  ringInner: (active) => ({ position:"absolute", inset:5, borderRadius:"50%", background: active ? palette.sage : "rgba(255,255,255,0.85)" }),

  // Day header
  dayHead: { textAlign:"center", padding:"20px 20px 0" },
  dayName: { fontFamily:FONT_SERIF, fontWeight:300, fontSize:22, color:palette.text, marginBottom:10 },
  dateInput: { padding:"7px 16px", borderRadius:50, border:`1px solid rgba(168,137,108,0.3)`, background:"rgba(255,255,255,0.5)", color:palette.text, fontSize:13, outline:"none", fontFamily:FONT_SANS, colorScheme:"light", backdropFilter:"blur(4px)" },

  // Progress card
  progCard: { margin:"20px 20px 0", background:"rgba(255,255,255,0.50)", backdropFilter:"blur(12px)", border:`1px solid rgba(255,255,255,0.65)`, borderRadius:22, padding:"18px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 12px 30px rgba(58,53,48,0.06)" },
  progPct:  { fontFamily:FONT_SERIF, fontWeight:300, fontSize:52, color:palette.sage, lineHeight:1, letterSpacing:"-2px" },
  progUnit: { fontSize:18, color:palette.textMute, fontStyle:"italic" },
  progRight: { flex:1, paddingLeft:20 },
  progLabel: { fontSize:10, letterSpacing:2, textTransform:"uppercase", color:palette.textMute, marginBottom:8 },
  progBar:   { height:5, background:"rgba(58,53,48,0.08)", borderRadius:3, overflow:"hidden" },
  progFill: (pct) => ({ height:"100%", width:`${pct}%`, background: pct===100 ? `linear-gradient(90deg,${palette.sage},${palette.sageDark})` : `linear-gradient(90deg,${palette.sand},${palette.sage})`, borderRadius:3, transition:"width 0.4s" }),

  // Sections
  content: { padding:"0 20px" },
  section: { marginTop:24 },
  secHead: { display:"flex", alignItems:"center", gap:10, marginBottom:12, padding:"0 4px" },
  secIcon: { width:34, height:34, borderRadius:11, background:"rgba(255,255,255,0.50)", border:`1px solid rgba(255,255,255,0.65)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, backdropFilter:"blur(6px)" },
  secLabel: { fontFamily:FONT_SERIF, fontWeight:400, fontSize:18, color:palette.text, letterSpacing:"-0.2px" },

  item: (checked) => ({ display:"flex", alignItems:"center", gap:13, padding:"13px 16px", marginBottom:8, borderRadius:16, background: checked ? palette.sageLight : "rgba(255,255,255,0.50)", border:`1px solid ${checked ? palette.sageBdr : "rgba(255,255,255,0.65)"}`, backdropFilter:"blur(8px)", cursor:"pointer", userSelect:"none", transition:"all 0.2s", boxShadow: checked ? "none" : "0 4px 12px rgba(58,53,48,0.04)" }),
  itemCircle: (checked) => ({ width:24, height:24, borderRadius:"50%", flexShrink:0, border: checked ? `1.5px solid ${palette.sage}` : `1.5px solid ${palette.sand}`, background: checked ? palette.sage : "rgba(255,255,255,0.5)", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }),
  itemText: (checked) => ({ fontSize:14, lineHeight:1.45, color: checked ? palette.sageDark : palette.text, textDecoration: checked ? "line-through" : "none", textDecorationColor:"rgba(124,148,124,0.4)", opacity: checked ? 0.8 : 1, transition:"all 0.2s" }),

  // Inputs
  inputRow:   { display:"flex", gap:10, marginTop:4, flexWrap:"wrap" },
  inputGroup: { flex:1, minWidth:110 },
  inputLabel: { fontSize:10, letterSpacing:1.5, textTransform:"uppercase", color:palette.textMute, marginBottom:5 },
  inputField: { width:"100%", padding:"9px 12px", borderRadius:12, border:`1px solid rgba(168,137,108,0.3)`, background:"rgba(255,255,255,0.5)", color:palette.text, fontSize:16, outline:"none", fontFamily:FONT_SANS, backdropFilter:"blur(4px)", boxSizing:"border-box" },
  inputUnit:  { fontSize:12, color:palette.textMute, whiteSpace:"nowrap" },

  // Metrics
  metricsGrid: { display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10 },
  metricCard:  { background:"rgba(255,255,255,0.50)", border:`1px solid rgba(255,255,255,0.65)`, borderRadius:16, padding:"12px 14px", backdropFilter:"blur(8px)", boxShadow:"0 4px 12px rgba(58,53,48,0.04)" },
  metricLabel: { fontSize:10, letterSpacing:1.5, textTransform:"uppercase", color:palette.textMute, marginBottom:5 },
  metricValue: { fontFamily:FONT_SERIF, fontWeight:300, fontSize:26, color:palette.text },
  metricUnit:  { fontSize:11, color:palette.textMute, fontStyle:"italic", marginLeft:3 },

  // Notes
  notesArea: { width:"100%", boxSizing:"border-box", padding:"14px 16px", borderRadius:16, border:`1px solid rgba(168,137,108,0.25)`, background:"rgba(255,255,255,0.45)", color:palette.text, fontSize:14, fontFamily:FONT_SANS, outline:"none", resize:"vertical", lineHeight:1.6, backdropFilter:"blur(8px)" },

  // Warning + Reset
  warning:  { padding:"12px 16px", borderRadius:16, border:`1px solid ${palette.warnBdr}`, background:palette.warnBg, fontSize:12, color:palette.warn, lineHeight:1.6, textAlign:"center", fontStyle:"italic" },
  resetWrap: { textAlign:"center", marginTop:20 },
};

// ── Checkmark ─────────────────────────────────────────────────────────────────
function Checkmark() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path d="M2 6l3 3 5-5" stroke="#f0e8dd" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(() => ensureCurrentWeek(loadFromStorage()));

  const [activeWeekIndex, setActiveWeekIndex] = useState(() => {
    const d = ensureCurrentWeek(loadFromStorage());
    const idx = d.weeks.findIndex(w => w.weekStart === getMonday());
    return idx >= 0 ? idx : d.weeks.length - 1;
  });

  const [activeDay,   setActiveDay]   = useState(todayIndex());
  const [showExport,  setShowExport]  = useState(false);
  const [showImport,  setShowImport]  = useState(false);
  const [importText,  setImportText]  = useState("");
  const [importMsg,   setImportMsg]   = useState("");
  const [copied,      setCopied]      = useState(false);
  const [savedFlash,  setSavedFlash]  = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm, confirmLabel }

  useEffect(() => {
    saveToStorage(data);
    setSavedFlash(true);
    const t = setTimeout(() => setSavedFlash(false), 1200);
    return () => clearTimeout(t);
  }, [data]);

  useEffect(() => {
    if (!day.date) {
      setDt(weekDates(activeWeek.weekStart)[activeDay]);
    }
  }, [activeDay, activeWeekIndex]);

  const activeWeek = data.weeks[activeWeekIndex];
  const day        = activeWeek.days[activeDay];
  const today      = todayStr();

  // ── Mutators ──────────────────────────────────────────────────────────────

  const updateDay = (fn) =>
    setData(prev => ({
      ...prev,
      weeks: prev.weeks.map((w, wi) =>
        wi !== activeWeekIndex ? w : { ...w, days: w.days.map((d, di) => di !== activeDay ? d : fn(d)) }
      ),
    }));

  const toggle  = (id) => updateDay(d => ({ ...d, checks: { ...d.checks, [id]: !d.checks[id] } }));
  const setInp  = (id, v) => updateDay(d => ({ ...d, inputs: { ...d.inputs, [id]: v } }));
  const setNts  = (v) => updateDay(d => ({ ...d, notes: v }));
  const setDt   = (v) => updateDay(d => ({ ...d, date: v }));

  const resetDay = () => setConfirmModal({
    message: `${FULL_DAYS[activeDay]} wirklich zurücksetzen?`,
    onConfirm: () => updateDay(d => ({ ...emptyDay(), date: d.date })),
    confirmLabel: "Zurücksetzen",
  });

  // ── Export / Import ───────────────────────────────────────────────────────

  const handleCopy = () =>
    navigator.clipboard.writeText(buildExportText(data)).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });

  const handleImport = () => {
    const result = parseImport(importText);
    if (result) {
      setData(result);
      const idx = result.weeks.findIndex(w => w.weekStart === getMonday());
      setActiveWeekIndex(idx >= 0 ? idx : result.weeks.length - 1);
      setShowImport(false);
      setImportText("");
      setImportMsg("");
    } else {
      setImportMsg("⚠ Ungültiges Format – kompletten Export-Text einfügen.");
    }
  };

  // ── Week navigation ───────────────────────────────────────────────────────

  const canPrev = activeWeekIndex > 0;
  const canNext = activeWeekIndex < data.weeks.length - 1;

  return (
    <div style={S.app}>
      <div style={S.blob1} />
      <div style={S.blob2} />

      <div style={S.inner}>

        {/* ── Confirm Modal ── */}
        {confirmModal && (
          <div style={S.modal} onClick={() => setConfirmModal(null)}>
            <div style={S.modalBox} onClick={e => e.stopPropagation()}>
              <div style={S.modalTitle}>Bestätigung</div>
              <div style={S.modalSub}>{confirmModal.message}</div>
              <div style={{display:"flex", gap:10, marginTop:16, justifyContent:"flex-end"}}>
                <button onClick={() => setConfirmModal(null)} style={S.btn("secondary")}>Abbrechen</button>
                <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} style={S.btn("danger")}>
                  {confirmModal.confirmLabel || "Bestätigen"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Export Modal ── */}
        {showExport && (
          <div style={S.modal} onClick={() => setShowExport(false)}>
            <div style={S.modalBox} onClick={e => e.stopPropagation()}>
              <div style={S.modalTitle}>Wochendaten exportieren</div>
              <div style={S.modalSub}>Kopiere den Text und speichere ihn in deiner Notizen-App. Zum Wiederherstellen importieren.</div>
              <textarea readOnly value={buildExportText(data)} rows={8} style={S.ta} onFocus={e => e.target.select()} />
              <div style={{display:"flex", gap:10, marginTop:16, justifyContent:"flex-end"}}>
                <button onClick={() => setShowExport(false)} style={S.btn("secondary")}>Schließen</button>
                <button onClick={handleCopy} style={S.btn("primary")}>{copied ? "✓ Kopiert" : "Kopieren"}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Import Modal ── */}
        {showImport && (
          <div style={S.modal} onClick={() => setShowImport(false)}>
            <div style={S.modalBox} onClick={e => e.stopPropagation()}>
              <div style={S.modalTitle}>Daten importieren</div>
              <div style={S.modalSub}>Gespeicherten Export-Text einfügen:</div>
              <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Export-Text hier einfügen…" rows={8} style={S.ta} />
              {importMsg && (
                <div style={{fontSize:13, marginTop:8, color: importMsg.startsWith("✓") ? palette.sage : palette.red}}>
                  {importMsg}
                </div>
              )}
              <div style={{display:"flex", gap:10, marginTop:16, justifyContent:"flex-end"}}>
                <button onClick={() => { setShowImport(false); setImportText(""); setImportMsg(""); }} style={S.btn("secondary")}>Abbrechen</button>
                <button onClick={handleImport} style={S.btn("primary")}>Laden</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div style={S.header}>
          <div style={S.headerMeta}>Phase 1 · Patellatendinopathie</div>
          <h1 style={S.headerTitle}>
            Knie<em style={S.headerTitleEm}>protokoll</em>
          </h1>
          <div style={S.savedFlash(savedFlash)}>
            {savedFlash ? "✓ Gespeichert" : "● Lokal gespeichert"}
          </div>
          <div style={S.headerBtns}>
            <button onClick={() => setShowImport(true)} style={S.btn("secondary")}>📥 Importieren</button>
            <button onClick={() => setShowExport(true)} style={S.btn("primary")}>📤 Exportieren</button>
          </div>
        </div>

        {/* ── Week Navigation ── */}
        <div style={S.weekNav}>
          <button
            onClick={() => canPrev && setActiveWeekIndex(i => i - 1)}
            style={S.weekNavBtn(!canPrev)}
            aria-label="Vorherige Woche"
          >◀</button>
          <div style={S.weekLabel}>
            <div style={S.weekKW}>KW {getKW(activeWeek.weekStart)}</div>
            <div style={S.weekRange}>{formatWeekRange(activeWeek.weekStart)}</div>
          </div>
          <button
            onClick={() => canNext && setActiveWeekIndex(i => i + 1)}
            style={S.weekNavBtn(!canNext)}
            aria-label="Nächste Woche"
          >▶</button>
        </div>

        {/* ── Day Picker ── */}
        <div style={S.dayPicker}>
          {DAYS.map((d, i) => {
            const isA = i === activeDay;
            const isT = weekDates(activeWeek.weekStart)[i] === today;
            return (
              <button key={i} onClick={() => setActiveDay(i)} style={S.dayPill(isA)}>
                {isT && <div style={S.todayDot(isA)} />}
                <span style={{fontSize:10, letterSpacing:0.5}}>{d}</span>
              </button>
            );
          })}
        </div>

        {/* ── Day Name + Date ── */}
        <div style={S.dayHead}>
          <div style={S.dayName}>{FULL_DAYS[activeDay]}</div>
          <input
            type="date"
            value={day.date || ""}
            onChange={e => setDt(e.target.value)}
            style={S.dateInput}
          />
        </div>

        {/* ── Sections ── */}
        <div style={S.content}>
          {SECTIONS.map(sec => (
            <div key={sec.id} style={S.section}>
              <div style={S.secHead}>
                <div style={S.secIcon}>{sec.emoji}</div>
                <span style={S.secLabel}>{sec.label}</span>
              </div>

              {sec.items.map(item => (
                <div key={item.id} onClick={() => toggle(item.id)} style={S.item(day.checks[item.id])}>
                  <div style={S.itemCircle(day.checks[item.id])}>
                    {day.checks[item.id] && <Checkmark />}
                  </div>
                  <span style={S.itemText(day.checks[item.id])}>{item.text}</span>
                </div>
              ))}

              {(sec.inputs || []).length > 0 && (
                <div style={S.inputRow}>
                  {(sec.inputs || []).map(inp => (
                    <div key={inp.id} style={S.inputGroup}>
                      <div style={S.inputLabel}>{inp.label}</div>
                      <div style={{display:"flex", alignItems:"center", gap:8}}>
                        <input
                          type="number"
                          placeholder={inp.placeholder}
                          value={day.inputs[inp.id] || ""}
                          onChange={e => setInp(inp.id, e.target.value)}
                          style={S.inputField}
                        />
                        <span style={S.inputUnit}>{inp.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* ── Tageswerte ── */}
          <div style={S.section}>
            <div style={S.secHead}>
              <div style={S.secIcon}>📊</div>
              <span style={S.secLabel}>Tageswerte</span>
            </div>
            <div style={S.metricsGrid}>
              {METRICS.map(m => (
                <div key={m.id} style={S.metricCard}>
                  <div style={S.metricLabel}>{m.label}</div>
                  <div style={{display:"flex", alignItems:"center", gap:4}}>
                    <input
                      type="number"
                      value={day.inputs[m.id] || ""}
                      onChange={e => setInp(m.id, e.target.value)}
                      style={{...S.inputField, fontSize:20, padding:"6px 8px"}}
                    />
                    <span style={S.metricUnit}>{m.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Notizen ── */}
          <div style={S.section}>
            <div style={S.secHead}>
              <div style={S.secIcon}>📝</div>
              <span style={S.secLabel}>Notizen</span>
            </div>
            <textarea
              value={day.notes}
              onChange={e => setNts(e.target.value)}
              placeholder="Besonderheiten, Beobachtungen…"
              rows={4}
              style={S.notesArea}
            />
          </div>

          {/* ── Warnung ── */}
          <div style={{...S.warning, marginTop:20}}>
            ⚠ Kein Wandsitz wenn Schmerz &gt; 3–4/10 · Kein Rad bei Schmerz · Keine Beinübungen im Studio
          </div>

          {/* ── Reset ── */}
          <div style={S.resetWrap}>
            <button onClick={resetDay} style={S.btn("secondary")}>Tag zurücksetzen</button>
          </div>
        </div>
      </div>
    </div>
  );
}
