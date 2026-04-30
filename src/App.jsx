import { useState, useEffect, useRef } from "react";

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
    ]
  },
  {
    id: "abends", label: "Abends", emoji: "🌙",
    items: [
      { id: "faszie_quad", text: "Faszienrolle Quadrizeps – 2× pro Bein" },
      { id: "faszie_itb",  text: "Faszienrolle ITB/Außenseite – 1× pro Bein" },
      { id: "faszie_add",  text: "Faszienrolle Adduktoren – 1× pro Bein" },
      { id: "trigger",     text: "Triggerpunkte – 20–30 Sek. (nicht auf Kniescheibe!)" },
      { id: "kuehlen",     text: "Kühlen – 15 Min. Kühlpack auf Patellasehne" },
      { id: "laufen",      text: "Locker herumlaufen – 5–10 Min." },
      { id: "hochlagern",  text: "Beine hochlagern" },
    ]
  },
];

const METRICS = [
  { id: "schmerz_aufstehen", label: "Schmerz beim Aufstehen", unit: "/10" },
  { id: "schmerz_treppe",    label: "Schmerz Treppe abwärts",  unit: "/10" },
  { id: "steifigkeit",       label: "Morgensteifigkeit",        unit: "Min." },
  { id: "rad",               label: "Rad heute",                unit: "km"  },
];

const STORAGE_KEY = "patella_protokoll_v1";

function emptyDay() {
  const checks = {};
  SECTIONS.forEach(s => s.items.forEach(i => (checks[i.id] = false)));
  const inputs = {};
  SECTIONS.forEach(s => (s.inputs || []).forEach(i => (inputs[i.id] = "")));
  METRICS.forEach(m => (inputs[m.id] = ""));
  return { checks, inputs, notes: "" };
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function todayIndex() {
  return (new Date().getDay() + 6) % 7;
}

function buildExportText(data) {
  const lines = ["=== PATELLA PROTOKOLL EXPORT ===", `Exportiert: ${new Date().toLocaleString("de-DE")}`, ""];
  data.forEach((day, i) => {
    const done = Object.values(day.checks).filter(Boolean).length;
    const total = Object.values(day.checks).length;
    lines.push(`--- ${FULL_DAYS[i]} (${done}/${total} erledigt) ---`);
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

export default function App() {
  const [activeDay, setActiveDay] = useState(todayIndex());
  const [data, setData] = useState(() => loadFromStorage());
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Auto-save whenever data changes
  useEffect(() => {
    saveToStorage(data);
    setSavedFlash(true);
    const t = setTimeout(() => setSavedFlash(false), 1200);
    return () => clearTimeout(t);
  }, [data]);

  const day = data[activeDay];

  const toggle = (id) => setData(prev => prev.map((d,i) => i===activeDay ? {...d, checks:{...d.checks,[id]:!d.checks[id]}} : d));
  const setInp = (id,v) => setData(prev => prev.map((d,i) => i===activeDay ? {...d, inputs:{...d.inputs,[id]:v}} : d));
  const setNts = (v) => setData(prev => prev.map((d,i) => i===activeDay ? {...d, notes:v} : d));
  const resetDay = () => { if(!confirm(`${FULL_DAYS[activeDay]} zurücksetzen?`)) return; setData(prev => prev.map((d,i)=>i===activeDay?emptyDay():d)); };

  const prog = (idx) => {
    const d = data[idx];
    const total = SECTIONS.reduce((s,sec)=>s+sec.items.length,0);
    return Math.round((Object.values(d.checks).filter(Boolean).length/total)*100);
  };
  const pct = prog(activeDay);

  const handleCopy = () => {
    navigator.clipboard.writeText(buildExportText(data)).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2500); });
  };

  const handleImport = () => {
    const result = parseImport(importText);
    if (result) {
      setData(result);
      setImportMsg("✓ Geladen!");
      setTimeout(()=>{setShowImport(false);setImportText("");setImportMsg("");},1200);
    } else {
      setImportMsg("⚠ Ungültiges Format – kompletten Export-Text einfügen.");
    }
  };

  const S = {
    modal: { position:"fixed",inset:0,zIndex:100,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 },
    box:   { width:"100%",maxWidth:420,background:"#1a2e4a",borderRadius:16,padding:24,border:"1px solid rgba(91,163,217,0.3)" },
    btn:   (c="#5ba3d9") => ({ padding:"9px 18px",borderRadius:20,border:`1px solid ${c}55`,background:`${c}18`,color:c,fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif" }),
    ta:    { width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:8,border:"1px solid rgba(91,163,217,0.3)",background:"rgba(0,0,0,0.3)",color:"#c8dff0",fontSize:11,fontFamily:"monospace",resize:"none" },
    secHdr:{ display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid rgba(91,163,217,0.3)",paddingBottom:6,marginBottom:10 },
    lbl:   { fontSize:13,letterSpacing:2,textTransform:"uppercase",color:"#7aa8cc" },
  };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0f1b2d 0%,#1a2e4a 60%,#0d2137 100%)",fontFamily:"Georgia,'Times New Roman',serif",color:"#e8f0f8",paddingBottom:40}}>

      {/* Export Modal */}
      {showExport && (
        <div style={S.modal} onClick={()=>setShowExport(false)}>
          <div style={S.box} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,color:"#c8dff0",marginBottom:8}}>📤 Wochendaten exportieren</div>
            <div style={{fontSize:13,color:"#7aa8cc",marginBottom:14,lineHeight:1.6}}>
              Kopiere den Text und speichere ihn in deiner Notizen-App. Zum Wiederherstellen einfach importieren.
            </div>
            <textarea readOnly value={buildExportText(data)} rows={8} style={S.ta} onFocus={e=>e.target.select()} />
            <div style={{display:"flex",gap:10,marginTop:14,justifyContent:"flex-end"}}>
              <button onClick={()=>setShowExport(false)} style={S.btn("#7aa8cc")}>Schließen</button>
              <button onClick={handleCopy} style={S.btn(copied?"#4caf82":"#5ba3d9")}>{copied?"✓ Kopiert!":"Kopieren"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div style={S.modal} onClick={()=>setShowImport(false)}>
          <div style={S.box} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,color:"#c8dff0",marginBottom:8}}>📥 Daten importieren</div>
            <div style={{fontSize:13,color:"#7aa8cc",marginBottom:14,lineHeight:1.6}}>Gespeicherten Export-Text einfügen:</div>
            <textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Export-Text hier einfügen..." rows={8} style={S.ta} />
            {importMsg && <div style={{fontSize:13,marginTop:8,color:importMsg.startsWith("✓")?"#4caf82":"#e87878"}}>{importMsg}</div>}
            <div style={{display:"flex",gap:10,marginTop:14,justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowImport(false);setImportText("");setImportMsg("");}} style={S.btn("#7aa8cc")}>Abbrechen</button>
              <button onClick={handleImport} style={S.btn("#5ba3d9")}>Laden</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{padding:"24px 16px 0",textAlign:"center"}}>
        <div style={{fontSize:11,letterSpacing:3,color:"#7aa8cc",textTransform:"uppercase",marginBottom:6}}>Phase 1 · Patellatendinopathie</div>
        <h1 style={{margin:0,fontSize:22,fontWeight:"normal",color:"#c8dff0"}}>Tagesprotokoll</h1>

        {/* Auto-save indicator */}
        <div style={{fontSize:11,color:savedFlash?"#4caf82":"rgba(76,175,130,0.3)",marginTop:6,transition:"color 0.4s",letterSpacing:1}}>
          {savedFlash ? "✓ Automatisch gespeichert" : "● Lokaler Speicher aktiv"}
        </div>

        <div style={{display:"flex",justifyContent:"center",gap:10,marginTop:12}}>
          <button onClick={()=>setShowImport(true)} style={S.btn("#7aa8cc")}>📥 Importieren</button>
          <button onClick={()=>setShowExport(true)} style={S.btn("#5ba3d9")}>📤 Exportieren</button>
        </div>
      </div>

      {/* Day picker */}
      <div style={{display:"flex",justifyContent:"center",gap:6,padding:"20px 12px 0",flexWrap:"wrap"}}>
        {DAYS.map((d,i) => {
          const p=prog(i), isA=i===activeDay, isT=i===todayIndex();
          return (
            <button key={i} onClick={()=>setActiveDay(i)} style={{position:"relative",width:42,height:52,borderRadius:10,
              border:isA?"2px solid #5ba3d9":"1px solid rgba(91,163,217,0.25)",
              background:isA?"rgba(91,163,217,0.18)":"rgba(255,255,255,0.04)",
              color:isA?"#c8dff0":"#7aa8cc",fontFamily:"Georgia,serif",fontSize:13,fontWeight:isA?"bold":"normal",
              cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3}}>
              <span>{d}</span>
              <div style={{width:22,height:4,borderRadius:2,background:"rgba(255,255,255,0.1)",overflow:"hidden"}}>
                <div style={{width:`${p}%`,height:"100%",background:p===100?"#4caf82":"#5ba3d9",borderRadius:2}}/>
              </div>
              {isT && <div style={{position:"absolute",top:3,right:3,width:5,height:5,borderRadius:"50%",background:"#5ba3d9"}}/>}
            </button>
          );
        })}
      </div>

      {/* Day label + progress */}
      <div style={{textAlign:"center",padding:"16px 16px 0"}}>
        <div style={{fontSize:18,color:"#c8dff0",marginBottom:8}}>{FULL_DAYS[activeDay]}</div>
        <div style={{display:"inline-flex",alignItems:"center",gap:10}}>
          <div style={{width:140,height:6,borderRadius:3,background:"rgba(255,255,255,0.1)"}}>
            <div style={{width:`${pct}%`,height:"100%",borderRadius:3,background:pct===100?"#4caf82":"linear-gradient(90deg,#3a7bd5,#5ba3d9)",transition:"width 0.4s"}}/>
          </div>
          <span style={{fontSize:13,color:pct===100?"#4caf82":"#7aa8cc"}}>{pct}% {pct===100?"✓":""}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:480,margin:"0 auto",padding:"0 14px"}}>
        {SECTIONS.map(sec => (
          <div key={sec.id} style={{marginTop:22}}>
            <div style={S.secHdr}>
              <span style={{fontSize:16}}>{sec.emoji}</span>
              <span style={S.lbl}>{sec.label}</span>
            </div>
            {sec.items.map(item => (
              <div key={item.id} onClick={()=>toggle(item.id)} style={{
                display:"flex",alignItems:"center",gap:12,padding:"11px 14px",marginBottom:6,borderRadius:10,
                background:day.checks[item.id]?"rgba(76,175,130,0.12)":"rgba(255,255,255,0.04)",
                border:day.checks[item.id]?"1px solid rgba(76,175,130,0.4)":"1px solid rgba(255,255,255,0.07)",
                cursor:"pointer",userSelect:"none",transition:"all 0.2s"}}>
                <div style={{width:22,height:22,borderRadius:6,flexShrink:0,
                  border:day.checks[item.id]?"2px solid #4caf82":"2px solid rgba(91,163,217,0.5)",
                  background:day.checks[item.id]?"#4caf82":"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                  {day.checks[item.id] && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>}
                </div>
                <span style={{fontSize:14,lineHeight:1.4,color:day.checks[item.id]?"#a8d5b5":"#c8dff0",textDecoration:day.checks[item.id]?"line-through":"none",opacity:day.checks[item.id]?0.7:1}}>
                  {item.text}
                </span>
              </div>
            ))}
            {(sec.inputs||[]).length>0 && (
              <div style={{display:"flex",gap:10,marginTop:4,flexWrap:"wrap"}}>
                {(sec.inputs||[]).map(inp=>(
                  <div key={inp.id} style={{flex:1,minWidth:110}}>
                    <div style={{fontSize:11,color:"#7aa8cc",marginBottom:4,letterSpacing:1}}>{inp.label}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <input type="number" placeholder={inp.placeholder} value={day.inputs[inp.id]||""} onChange={e=>setInp(inp.id,e.target.value)}
                        style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid rgba(91,163,217,0.3)",background:"rgba(255,255,255,0.06)",color:"#c8dff0",fontSize:16,outline:"none",fontFamily:"Georgia,serif"}}/>
                      <span style={{fontSize:12,color:"#7aa8cc",whiteSpace:"nowrap"}}>{inp.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Tageswerte */}
        <div style={{marginTop:22}}>
          <div style={S.secHdr}><span style={{fontSize:16}}>📊</span><span style={S.lbl}>Tageswerte</span></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {METRICS.map(m=>(
              <div key={m.id} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"10px 12px"}}>
                <div style={{fontSize:11,color:"#7aa8cc",marginBottom:5}}>{m.label}</div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <input type="number" value={day.inputs[m.id]||""} onChange={e=>setInp(m.id,e.target.value)}
                    style={{width:"100%",padding:"6px 8px",borderRadius:7,border:"1px solid rgba(91,163,217,0.3)",background:"rgba(255,255,255,0.06)",color:"#c8dff0",fontSize:18,outline:"none",fontFamily:"Georgia,serif"}}/>
                  <span style={{fontSize:12,color:"#7aa8cc",whiteSpace:"nowrap"}}>{m.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notizen */}
        <div style={{marginTop:22}}>
          <div style={S.secHdr}><span style={{fontSize:16}}>📝</span><span style={S.lbl}>Notizen</span></div>
          <textarea value={day.notes} onChange={e=>setNts(e.target.value)} placeholder="Besonderheiten, Beobachtungen..." rows={4}
            style={{width:"100%",boxSizing:"border-box",padding:"12px 14px",borderRadius:10,border:"1px solid rgba(91,163,217,0.25)",background:"rgba(255,255,255,0.04)",color:"#c8dff0",fontSize:14,fontFamily:"Georgia,serif",outline:"none",resize:"vertical",lineHeight:1.6}}/>
        </div>

        {/* Warning */}
        <div style={{marginTop:20,padding:"10px 14px",borderRadius:10,border:"1px solid rgba(220,80,80,0.35)",background:"rgba(220,80,80,0.07)",fontSize:12,color:"#e87878",lineHeight:1.6,textAlign:"center"}}>
          ⚠ Kein Wandsitz wenn Schmerz &gt; 3–4/10 · Kein Rad bei Schmerz · Keine Beinübungen im Studio
        </div>

        {/* Reset */}
        <div style={{textAlign:"center",marginTop:18}}>
          <button onClick={resetDay} style={S.btn("#7aa8cc")}>Tag zurücksetzen</button>
        </div>
      </div>
    </div>
  );
}
