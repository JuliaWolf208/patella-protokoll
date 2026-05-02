import { useState, useEffect } from "react";

const DAYS = ["Mo","Di","Mi","Do","Fr","Sa","So"];
const FULL_DAYS = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];

const SECTIONS = [
  {
    id: "morgens", label: "Morgens", emoji: "☀️",
    items: [
      { id: "pendeln_m", text: "Pendeln – 5 Min. (sanfte Aktivierung)" },
      { id: "wandsitz",  text: "Wandsitz – 5× 45 Sek., 2 Min. Pause" },
    ],
    inputs: [
      { id: "winkel",           label: "Winkel",         unit: "°",   placeholder: "60" },
      { id: "schmerz_wandsitz", label: "Schmerz dabei",  unit: "/10", placeholder: "0"  },
    ]
  },
  {
    id: "tag", label: "Über den Tag", emoji: "🔄",
    items: [
      { id: "pendeln_1", text: "Pendeln nach langem Sitzen (1. Mal)" },
      { id: "pendeln_2", text: "Pendeln nach langem Sitzen (2. Mal)" },
      { id: "pendeln_3", text: "Pendeln nach langem Sitzen (3. Mal)" },
      { id: "scheibenwischer", text: "Scheibenwischer – 3–5 Min. entspannt" },
    ]
  },
  {
    id: "huefte", label: "Hüftprogramm", emoji: "🦵",
    items: [
      { id: "huefte_supersatz", text: "Supersatz: 15 Clamshells + 15 Beinheben, 2 Durchgänge pro Seite" },
      { id: "huefte_hipthrust", text: "Hipthrusts an der Couch – 2× 12–15, Po 2 Sek. fest" },
      { id: "huefte_4er",       text: "4er-Dehnung – 2 Min. pro Seite (Zehen zum Schienbein!)" },
    ]
  },
  {
    id: "abends", label: "Abends", emoji: "🌙",
    items: [
      { id: "faszie_quad", text: "Faszienrolle Quadrizeps – 2× pro Bein" },
      { id: "faszie_itb",  text: "Faszienrolle ITB/Außenseite – 1× pro Bein" },
      { id: "faszie_add",  text: "Faszienrolle Adduktoren – 1× pro Bein" },
      { id: "kuehlen",     text: "Kühlen – 15 Min. Kühlpack auf Patellasehne, Beine hochlagern" },
    ]
  },
];

const METRICS = [
  { id: "schmerz_aufstehen", label: "Schmerz beim Aufstehen", unit: "/10" },
  { id: "schmerz_treppe",    label: "Schmerz Treppe abwärts",  unit: "/10" },
  { id: "rad",               label: "Rad heute",                unit: "km"  },
];

const STORAGE_KEY = "patella_protokoll_v1";

function emptyDay() {
  const checks = {};
  SECTIONS.forEach(s => s.items.forEach(i => (checks[i.id] = false)));
  const inputs = {};
  SECTIONS.forEach(s => (s.inputs || []).forEach(i => (inputs[i.id] = "")));
  METRICS.forEach(m => (inputs[m.id] = ""));
  return { checks, inputs, notes: "", date: "" };
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 7) return parsed;
    }
  } catch {}
  return Array.from({ length: 7 }, emptyDay);
}

function saveToStorage(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function todayIndex() {
  return (new Date().getDay() + 6) % 7;
}

function buildExportText(data) {
  const lines = ["=== PATELLA PROTOKOLL EXPORT ===", `Exportiert: ${new Date().toLocaleString("de-DE")}`, ""];
  data.forEach((day, i) => {
    const allChecks = SECTIONS.flatMap(sec => sec.items.map(item => day.checks[item.id]));
    const done = allChecks.filter(Boolean).length;
    const total = allChecks.length;
    const datePart = day.date ? " · " + new Date(day.date).toLocaleDateString("de-DE") : "";
    lines.push(`--- ${FULL_DAYS[i]}${datePart} (${done}/${total} erledigt) ---`);
    SECTIONS.forEach(sec => {
      sec.items.forEach(item => lines.push(`  [${day.checks[item.id] ? "x" : " "}] ${item.text}`));
      (sec.inputs || []).forEach(inp => { if (day.inputs[inp.id]) lines.push(`  ${inp.label}: ${day.inputs[inp.id]} ${inp.unit}`); });
    });
    METRICS.forEach(m => { if (day.inputs[m.id]) lines.push(`  ${m.label}: ${day.inputs[m.id]} ${m.unit}`); });
    if (day.notes) lines.push(`  Notizen: ${day.notes}`);
    lines.push("");
  });
  lines.push("=== ENDE ===");
  lines.push("RAW:" + JSON.stringify(data));
  return lines.join("\n");
}

function parseImport(text) {
  try {
    const rawMatch = text.match(/RAW:(.+)$/s);
    if (rawMatch) {
      const parsed = JSON.parse(rawMatch[1].trim());
      if (Array.isArray(parsed) && parsed.length === 7) return parsed;
    }
  } catch {}
  return null;
}

// ── Inline styles ──────────────────────────────────────────────────────────────

const FONT_SANS  = "'DM Sans', 'Helvetica Neue', sans-serif";
const FONT_SERIF = "'Fraunces', Georgia, serif";

const palette = {
  bg0:        "#f0e8dd",
  bg1:        "#e4dccd",
  bg2:        "#d8d0c0",
  glass:      "rgba(255,255,255,0.50)",
  glassBdr:   "rgba(255,255,255,0.65)",
  glassDark:  "rgba(255,255,255,0.38)",
  sage:       "#7c947c",
  sageDark:   "#607860",
  sageLight:  "rgba(124,148,124,0.18)",
  sageBdr:    "rgba(124,148,124,0.35)",
  sand:       "#a8896c",
  text:       "#3a3530",
  textMid:    "#6b5d48",
  textMute:   "#8a7d6e",
  warn:       "#a8896c",
  warnBg:     "rgba(168,137,108,0.12)",
  warnBdr:    "rgba(168,137,108,0.22)",
  red:        "#c0604a",
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
  // decorative blobs
  blob1: {
    position: "fixed", top: -120, right: -120,
    width: 320, height: 320, borderRadius: "50%",
    background: `radial-gradient(circle, rgba(168,140,108,0.18), transparent 70%)`,
    pointerEvents: "none", zIndex: 0,
  },
  blob2: {
    position: "fixed", bottom: 160, left: -150,
    width: 380, height: 380, borderRadius: "50%",
    background: `radial-gradient(circle, rgba(124,148,124,0.14), transparent 70%)`,
    pointerEvents: "none", zIndex: 0,
  },
  inner: { position: "relative", zIndex: 1, maxWidth: 480, margin: "0 auto" },

  // Modal
  modal: {
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(58,53,48,0.45)",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
  },
  modalBox: {
    width: "100%", maxWidth: 420,
    background: palette.bg0,
    borderRadius: 24,
    padding: 28,
    border: `1px solid ${palette.glassBdr}`,
    boxShadow: "0 30px 60px rgba(58,53,48,0.2)",
  },
  modalTitle: { fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 400, color: palette.text, marginBottom: 8 },
  modalSub:   { fontSize: 13, color: palette.textMute, lineHeight: 1.6, marginBottom: 16 },
  ta: {
    width: "100%", boxSizing: "border-box",
    padding: "10px 14px", borderRadius: 12,
    border: `1px solid rgba(168,137,108,0.3)`,
    background: "rgba(255,255,255,0.5)",
    color: palette.text, fontSize: 11,
    fontFamily: "monospace", resize: "none", outline: "none",
  },

  // Buttons
  btn: (variant = "primary") => ({
    padding: "10px 20px", borderRadius: 50,
    border: variant === "primary"
      ? `1px solid ${palette.sage}`
      : `1px solid rgba(168,137,108,0.4)`,
    background: variant === "primary"
      ? palette.sage
      : "rgba(255,255,255,0.45)",
    color: variant === "primary" ? "#f0e8dd" : palette.textMid,
    fontSize: 13, cursor: "pointer",
    fontFamily: FONT_SANS,
    backdropFilter: "blur(4px)",
    transition: "all 0.2s",
  }),

  // Header
  header: { padding: "32px 20px 0", textAlign: "center" },
  headerMeta: {
    fontSize: 10, letterSpacing: 3, textTransform: "uppercase",
    color: palette.textMute, marginBottom: 10,
  },
  headerTitle: {
    fontFamily: FONT_SERIF, fontWeight: 300, fontSize: 40,
    color: palette.text, letterSpacing: "-0.8px", lineHeight: 1.05, margin: 0,
  },
  headerTitleEm: { fontStyle: "italic", color: palette.sage },
  savedFlash: (on) => ({
    fontSize: 11, letterSpacing: 1.5,
    color: on ? palette.sage : "rgba(124,148,124,0.35)",
    marginTop: 8, transition: "color 0.4s",
  }),
  headerBtns: { display: "flex", justifyContent: "center", gap: 10, marginTop: 16 },

  // Day picker
  dayPicker: {
    display: "flex", justifyContent: "center",
    gap: 6, padding: "24px 16px 0", flexWrap: "wrap",
  },
  dayPill: (active) => ({
    width: 40, height: 56, borderRadius: 20,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 5,
    border: active ? `1.5px solid ${palette.sage}` : `1px solid ${palette.glassBdr}`,
    background: active ? palette.sage : palette.glass,
    backdropFilter: "blur(8px)",
    color: active ? "#f0e8dd" : palette.textMute,
    fontSize: 11, cursor: "pointer",
    boxShadow: active ? `0 8px 20px rgba(124,148,124,0.3)` : "none",
    transition: "all 0.2s", position: "relative",
  }),
  todayDot: {
    position: "absolute", top: 5, right: 5,
    width: 5, height: 5, borderRadius: "50%",
    background: palette.sage,
  },

  // Progress ring (css via style attr)
  ring: (pct, active) => ({
    width: 20, height: 20, borderRadius: "50%",
    background: `conic-gradient(${active ? "#f0e8dd" : palette.sage} ${pct * 3.6}deg, rgba(0,0,0,0.1) ${pct * 3.6}deg)`,
    position: "relative",
  }),
  ringInner: (active) => ({
    position: "absolute", inset: 5, borderRadius: "50%",
    background: active ? palette.sage : "rgba(255,255,255,0.85)",
  }),

  // Day header
  dayHead: { textAlign: "center", padding: "20px 20px 0" },
  dayName: {
    fontFamily: FONT_SERIF, fontWeight: 300, fontSize: 22,
    color: palette.text, marginBottom: 10,
  },
  dateInput: {
    padding: "7px 16px", borderRadius: 50,
    border: `1px solid rgba(168,137,108,0.3)`,
    background: "rgba(255,255,255,0.5)",
    color: palette.text, fontSize: 13, outline: "none",
    fontFamily: FONT_SANS, colorScheme: "light",
    backdropFilter: "blur(4px)",
  },

  // Big progress card
  progCard: {
    margin: "20px 20px 0",
    background: palette.glass,
    backdropFilter: "blur(12px)",
    border: `1px solid ${palette.glassBdr}`,
    borderRadius: 22, padding: "18px 24px",
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 12px 30px rgba(58,53,48,0.06)",
  },
  progPct: {
    fontFamily: FONT_SERIF, fontWeight: 300,
    fontSize: 52, color: palette.sage, lineHeight: 1,
    letterSpacing: "-2px",
  },
  progUnit: { fontSize: 18, color: palette.textMute, fontStyle: "italic" },
  progRight: { flex: 1, paddingLeft: 20 },
  progLabel: {
    fontSize: 10, letterSpacing: 2, textTransform: "uppercase",
    color: palette.textMute, marginBottom: 8,
  },
  progBar: {
    height: 5, background: "rgba(58,53,48,0.08)",
    borderRadius: 3, overflow: "hidden",
  },
  progFill: (pct) => ({
    height: "100%", width: `${pct}%`,
    background: pct === 100
      ? `linear-gradient(90deg, ${palette.sage}, ${palette.sageDark})`
      : `linear-gradient(90deg, ${palette.sand}, ${palette.sage})`,
    borderRadius: 3, transition: "width 0.4s",
  }),

  // Sections
  content: { padding: "0 20px" },
  section: { marginTop: 24 },
  secHead: {
    display: "flex", alignItems: "center", gap: 10,
    marginBottom: 12, padding: "0 4px",
  },
  secIcon: {
    width: 34, height: 34, borderRadius: 11,
    background: palette.glass,
    border: `1px solid ${palette.glassBdr}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16,
    backdropFilter: "blur(6px)",
  },
  secLabel: {
    fontFamily: FONT_SERIF, fontWeight: 400, fontSize: 18,
    color: palette.text, letterSpacing: "-0.2px",
  },

  // Items
  item: (checked) => ({
    display: "flex", alignItems: "center", gap: 13,
    padding: "13px 16px", marginBottom: 8, borderRadius: 16,
    background: checked ? palette.sageLight : palette.glass,
    border: `1px solid ${checked ? palette.sageBdr : palette.glassBdr}`,
    backdropFilter: "blur(8px)",
    cursor: "pointer", userSelect: "none",
    transition: "all 0.2s",
    boxShadow: checked ? "none" : "0 4px 12px rgba(58,53,48,0.04)",
  }),
  itemCircle: (checked) => ({
    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
    border: checked ? `1.5px solid ${palette.sage}` : `1.5px solid ${palette.sand}`,
    background: checked ? palette.sage : "rgba(255,255,255,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.2s",
  }),
  itemText: (checked) => ({
    fontSize: 14, lineHeight: 1.45,
    color: checked ? palette.sageDark : palette.text,
    textDecoration: checked ? "line-through" : "none",
    textDecorationColor: "rgba(124,148,124,0.4)",
    opacity: checked ? 0.8 : 1,
    transition: "all 0.2s",
  }),

  // Inputs
  inputRow: {
    display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap",
  },
  inputGroup: { flex: 1, minWidth: 110 },
  inputLabel: {
    fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase",
    color: palette.textMute, marginBottom: 5,
  },
  inputField: {
    width: "100%", padding: "9px 12px",
    borderRadius: 12,
    border: `1px solid rgba(168,137,108,0.3)`,
    background: "rgba(255,255,255,0.5)",
    color: palette.text, fontSize: 16, outline: "none",
    fontFamily: FONT_SANS,
    backdropFilter: "blur(4px)",
    boxSizing: "border-box",
  },
  inputUnit: { fontSize: 12, color: palette.textMute, whiteSpace: "nowrap" },

  // Metrics grid
  metricsGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  metricCard: {
    background: palette.glass,
    border: `1px solid ${palette.glassBdr}`,
    borderRadius: 16, padding: "12px 16px",
    backdropFilter: "blur(8px)",
    boxShadow: "0 4px 12px rgba(58,53,48,0.04)",
  },
  metricLabel: {
    fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase",
    color: palette.textMute, marginBottom: 5,
  },
  metricValue: {
    fontFamily: FONT_SERIF, fontWeight: 300,
    fontSize: 28, color: palette.text,
  },
  metricUnit: { fontSize: 12, color: palette.textMute, fontStyle: "italic", marginLeft: 3 },

  // Notes
  notesArea: {
    width: "100%", boxSizing: "border-box",
    padding: "14px 16px", borderRadius: 16,
    border: `1px solid rgba(168,137,108,0.25)`,
    background: "rgba(255,255,255,0.45)",
    color: palette.text, fontSize: 14,
    fontFamily: FONT_SANS, outline: "none",
    resize: "vertical", lineHeight: 1.6,
    backdropFilter: "blur(8px)",
  },

  // Warning
  warning: {
    padding: "12px 16px", borderRadius: 16,
    border: `1px solid ${palette.warnBdr}`,
    background: palette.warnBg,
    fontSize: 12, color: palette.warn,
    lineHeight: 1.6, textAlign: "center",
    fontStyle: "italic",
  },

  // Reset
  resetWrap: { textAlign: "center", marginTop: 20 },
};

// ── Checkmark SVG ─────────────────────────────────────────────────────────────
function Checkmark() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path d="M2 6l3 3 5-5" stroke="#f0e8dd" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [activeDay, setActiveDay]   = useState(todayIndex());
  const [data, setData]             = useState(() => loadFromStorage());
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg,  setImportMsg]  = useState("");
  const [copied,     setCopied]     = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    saveToStorage(data);
    setSavedFlash(true);
    const t = setTimeout(() => setSavedFlash(false), 1200);
    return () => clearTimeout(t);
  }, [data]);

  const day = data[activeDay];

  const toggle  = (id) => setData(prev => prev.map((d,i) => i===activeDay ? {...d, checks:{...d.checks,[id]:!d.checks[id]}} : d));
  const setInp  = (id,v) => setData(prev => prev.map((d,i) => i===activeDay ? {...d, inputs:{...d.inputs,[id]:v}} : d));
  const setNts  = (v) => setData(prev => prev.map((d,i) => i===activeDay ? {...d, notes:v} : d));
  const setDt   = (v) => setData(prev => prev.map((d,i) => i===activeDay ? {...d, date:v} : d));
  const resetDay = () => {
    if (!confirm(`${FULL_DAYS[activeDay]} zurücksetzen?`)) return;
    setData(prev => prev.map((d,i) => i===activeDay ? emptyDay() : d));
  };

  const prog = (idx) => {
    const d = data[idx];
    const total = SECTIONS.reduce((s,sec) => s + sec.items.length, 0);
    if (total === 0) return 0;
    const done = SECTIONS.reduce((s,sec) => s + sec.items.filter(i => d.checks[i.id]).length, 0);
    return Math.round((done/total)*100);
  };
  const pct = prog(activeDay);

  const handleCopy = () => {
    navigator.clipboard.writeText(buildExportText(data)).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleImport = () => {
    const result = parseImport(importText);
    if (result) {
      setData(result);
      setImportMsg("✓ Geladen!");
      setTimeout(() => { setShowImport(false); setImportText(""); setImportMsg(""); }, 1200);
    } else {
      setImportMsg("⚠ Ungültiges Format – kompletten Export-Text einfügen.");
    }
  };

  return (
    <div style={S.app}>
      {/* Blobs */}
      <div style={S.blob1} />
      <div style={S.blob2} />

      <div style={S.inner}>

        {/* ── Export Modal ── */}
        {showExport && (
          <div style={S.modal} onClick={() => setShowExport(false)}>
            <div style={S.modalBox} onClick={e => e.stopPropagation()}>
              <div style={S.modalTitle}>Wochendaten exportieren</div>
              <div style={S.modalSub}>
                Kopiere den Text und speichere ihn in deiner Notizen-App. Zum Wiederherstellen einfach importieren.
              </div>
              <textarea readOnly value={buildExportText(data)} rows={8} style={S.ta} onFocus={e => e.target.select()} />
              <div style={{display:"flex", gap:10, marginTop:16, justifyContent:"flex-end"}}>
                <button onClick={() => setShowExport(false)} style={S.btn("secondary")}>Schließen</button>
                <button onClick={handleCopy} style={S.btn("primary")}>
                  {copied ? "✓ Kopiert" : "Kopieren"}
                </button>
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
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="Export-Text hier einfügen…"
                rows={8} style={S.ta}
              />
              {importMsg && (
                <div style={{fontSize:13, marginTop:8, color: importMsg.startsWith("✓") ? palette.sage : palette.red}}>
                  {importMsg}
                </div>
              )}
              <div style={{display:"flex", gap:10, marginTop:16, justifyContent:"flex-end"}}>
                <button onClick={() => { setShowImport(false); setImportText(""); setImportMsg(""); }} style={S.btn("secondary")}>
                  Abbrechen
                </button>
                <button onClick={handleImport} style={S.btn("primary")}>Laden</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div style={S.header}>
          <div style={S.headerMeta}>Phase 1 · Patellatendinopathie</div>
          <h1 style={S.headerTitle}>
            Tages<em style={S.headerTitleEm}>protokoll</em>
          </h1>
          <div style={S.savedFlash(savedFlash)}>
            {savedFlash ? "✓ Gespeichert" : "● Lokal gespeichert"}
          </div>
          <div style={S.headerBtns}>
            <button onClick={() => setShowImport(true)} style={S.btn("secondary")}>📥 Importieren</button>
            <button onClick={() => setShowExport(true)} style={S.btn("primary")}>📤 Exportieren</button>
          </div>
        </div>

        {/* ── Day Picker ── */}
        <div style={S.dayPicker}>
          {DAYS.map((d, i) => {
            const p = prog(i);
            const isA = i === activeDay;
            const isT = i === todayIndex();
            return (
              <button key={i} onClick={() => setActiveDay(i)} style={S.dayPill(isA)}>
                {isT && <div style={S.todayDot} />}
                <span style={{fontSize:10, letterSpacing:0.5}}>{d}</span>
                <div style={S.ring(p, isA)}>
                  <div style={S.ringInner(isA)} />
                </div>
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

        {/* ── Progress Card ── */}
        <div style={S.progCard}>
          <div style={S.progPct}>{pct}<span style={S.progUnit}>%</span></div>
          <div style={S.progRight}>
            <div style={S.progLabel}>Heute geschafft</div>
            <div style={S.progBar}>
              <div style={S.progFill(pct)} />
            </div>
            {pct === 100 && (
              <div style={{fontSize:11, color: palette.sage, marginTop:6, letterSpacing:1}}>
                ✓ Alles erledigt
              </div>
            )}
          </div>
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
                  <div style={{display:"flex", alignItems:"center", gap:6}}>
                    <input
                      type="number"
                      value={day.inputs[m.id] || ""}
                      onChange={e => setInp(m.id, e.target.value)}
                      style={{...S.inputField, fontSize:22, padding:"6px 10px"}}
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
          <div style={{...S.warning, marginTop: 20}}>
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
