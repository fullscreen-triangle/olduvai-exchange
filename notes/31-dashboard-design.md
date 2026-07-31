# Dashboard 


1. Center - AI RAG  I want the ai system to be staged, that is, the base model is ollama, and then, huggingfaceapi should be used to retrieve specialised domain models. I have an example of a sophisticated RAG system here https://github.com/fullscreen-triangle/four-sided-triangle. Its simply a matter of extracting ideas relevant here and implementing the system. Every linked page in the sidebars is an agent instance of the main home page model.

`import React, { useState, useRef, useEffect } from "react";

const SIDEBAR_WIDTH = 280;
const HOVER_ZONE = 48;

const LEFT_LINKS = [
  { id: "market", label: "Marketplace", icon: "◫" },
  { id: "prices", label: "Price Watch", icon: "⌗" },
  { id: "mylistings", label: "My Listings", icon: "◉" },
  { id: "buyers", label: "Buyer Requests", icon: "◌" },
  { id: "weather", label: "Weather", icon: "≋" },
];

const RIGHT_LINKS = [
  { id: "foreman", label: "Foreman", icon: "⬡", accent: true },
  { id: "alerts", label: "Alerts", icon: "△", count: 3 },
  { id: "tasks", label: "Tasks", icon: "☐", count: 7 },
  { id: "logs", label: "Activity Log", icon: "≡" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

const FOREMAN_STEPS = [
  {
    key: "location",
    title: "Where is your farm?",
    subtitle: "This helps us understand your climate, rainfall, and growing seasons.",
    fields: [
      { id: "country", label: "Country", type: "text", placeholder: "e.g. Kenya" },
      { id: "region", label: "Region / County", type: "text", placeholder: "e.g. Nakuru County" },
      { id: "altitude", label: "Altitude (if known)", type: "text", placeholder: "e.g. 1800m" },
    ],
  },
  {
    key: "land",
    title: "Tell us about your land",
    subtitle: "Even rough estimates help us plan better.",
    fields: [
      { id: "size", label: "Farm size", type: "text", placeholder: "e.g. 2 acres, 0.5 hectares" },
      { id: "soil", label: "Soil type (if known)", type: "select", options: ["Not sure", "Clay / heavy", "Loam / mixed", "Sandy", "Volcanic / red"] },
      { id: "water", label: "Water source", type: "select", options: ["Rain-fed only", "River / stream", "Borehole / well", "Dam / reservoir", "Piped / municipal"] },
      { id: "irrigated", label: "Do you have irrigation?", type: "select", options: ["No", "Drip", "Sprinkler", "Furrow / flood", "Manual watering"] },
    ],
  },
  {
    key: "crops",
    title: "What are you growing?",
    subtitle: "List current or planned crops. You can always add more later.",
    fields: [
      { id: "primary", label: "Main crop", type: "text", placeholder: "e.g. Maize" },
      { id: "secondary", label: "Second crop (optional)", type: "text", placeholder: "e.g. Beans" },
      { id: "tertiary", label: "Third crop (optional)", type: "text", placeholder: "e.g. Kale" },
      { id: "stage", label: "Current stage", type: "select", options: ["Planning / not yet planted", "Just planted", "Growing / mid-season", "Near harvest", "Between seasons"] },
    ],
  },
  {
    key: "resources",
    title: "What resources do you have?",
    subtitle: "This shapes what we recommend — no judgment, just better planning.",
    fields: [
      { id: "labor", label: "Available hands (including you)", type: "select", options: ["Just me", "2–3 people", "4–6 people", "7+ people"] },
      { id: "equipment", label: "Equipment", type: "select", options: ["Hand tools only", "Ox plough", "Small tractor", "Mechanised"] },
      { id: "inputs", label: "Access to fertiliser / chemicals?", type: "select", options: ["None", "Limited — what I can afford", "Good access through agro-dealer", "Full access"] },
      { id: "budget", label: "Season budget (optional)", type: "text", placeholder: "e.g. 15,000 KES" },
    ],
  },
  {
    key: "history",
    title: "Recent history & challenges",
    subtitle: "Understanding what happened before helps us plan what comes next.",
    fields: [
      { id: "lastcrop", label: "What did you grow last season?", type: "text", placeholder: "e.g. Maize and beans" },
      { id: "yield", label: "How was the yield?", type: "select", options: ["Good", "Average", "Poor", "Crop failed"] },
      { id: "problems", label: "Biggest challenge last season", type: "select", options: ["Drought / not enough rain", "Too much rain / flooding", "Pests", "Disease", "Weeds", "Poor soil", "No market / low prices", "Labour shortage", "Other"] },
      { id: "notes", label: "Anything else we should know?", type: "textarea", placeholder: "Any details, goals, or concerns…" },
    ],
  },
];

function generateWorkflow(data) {
  const crop = data.primary || "your crop";
  const stage = data.stage || "Planning / not yet planted";
  const isPlanning = stage.includes("Planning");
  const isMid = stage.includes("mid-season");
  const isHarvest = stage.includes("harvest");

  const tasks = [];

  if (isPlanning) {
    tasks.push(
      { week: "Now", task: "Land preparation", detail: `Clear and prepare ${data.size || "your plot"}. Turn soil to 15–20 cm depth. Incorporate any available manure or compost.`, priority: "high" },
      { week: "Week 1–2", task: "Soil improvement", detail: `${data.soil === "Sandy" ? "Add organic matter to improve water retention." : data.soil === "Clay / heavy" ? "Add sand or compost to improve drainage." : "Apply well-rotted manure at 2–3 tonnes per acre if available."}`, priority: "medium" },
      { week: "Week 2–3", task: `Plant ${crop}`, detail: `Sow at recommended spacing for ${crop}. If intercropping with ${data.secondary || "a legume"}, stagger rows.`, priority: "high" },
      { week: "Week 3–4", task: "First weeding", detail: "Weed within 2–3 weeks of germination. Early weeding is the single highest-impact task for yield.", priority: "high" },
      { week: "Week 5–6", task: "Top-dress fertiliser", detail: data.inputs === "None" ? "If no fertiliser available, side-dress with compost or wood ash for potassium." : "Apply top-dress (e.g. CAN) at 4–6 weeks after planting. Target: alongside crop rows, not on leaves.", priority: "medium" },
      { week: "Week 6–8", task: "Second weeding & pest scout", detail: "Weed again before canopy closes. Walk field edges and check undersides of leaves for pest damage.", priority: "high" },
      { week: "Week 10–12", task: "Monitor & protect", detail: "Check for disease symptoms. If using pesticide, observe pre-harvest intervals. Reduce irrigation if rains are consistent.", priority: "medium" },
      { week: "Week 14–18", task: "Harvest preparation", detail: `Begin drying / storage prep. Check local market prices for ${crop}. Contact buyers 2 weeks before expected harvest.`, priority: "high" },
    );
  } else if (isMid) {
    tasks.push(
      { week: "This week", task: "Field scouting", detail: `Walk every row of ${crop}. Look for yellowing, wilting, pest holes, or unusual spots.`, priority: "high" },
      { week: "This week", task: "Weeding check", detail: "If weeds are above ankle height between rows, weed immediately. Canopy closure is your deadline.", priority: "high" },
      { week: "Next week", task: "Fertiliser decision", detail: data.inputs === "None" ? "Apply wood ash or compost as side-dress if available." : "Top-dress if not yet done. Too late after flowering.", priority: "medium" },
      { week: "Week 3–4", task: "Pest & disease action", detail: "If scouting found damage, identify pest and treat. Consult agro-dealer with photos.", priority: "medium" },
      { week: "Week 6–8", task: "Pre-harvest planning", detail: `Identify ${data.labor === "Just me" ? "whether you need hired help for harvest" : "your harvest team roles"}. Prepare drying area and storage.`, priority: "high" },
      { week: "Week 8+", task: "Harvest & sell", detail: `Harvest ${crop} at correct moisture. List on marketplace immediately — early sellers get better prices.`, priority: "high" },
    );
  } else if (isHarvest) {
    tasks.push(
      { week: "Now", task: "Harvest timing", detail: `Check ${crop} maturity indicators. Harvesting too early or late reduces value and storage life.`, priority: "high" },
      { week: "Now", task: "Post-harvest handling", detail: "Dry to safe moisture levels (13% for grains). Sort and grade. Remove damaged produce.", priority: "high" },
      { week: "This week", task: "List on marketplace", detail: `Create listing for ${crop} with quantity, grade, and location. Include photos if possible.`, priority: "high" },
      { week: "Week 2", task: "Storage", detail: "Use hermetic bags or clean, dry storage. Elevate off ground. Check weekly for moisture or pest entry.", priority: "medium" },
      { week: "Week 2–3", task: "Next season planning", detail: "Record this season's yield, costs, and selling price. Begin planning next rotation.", priority: "medium" },
    );
  } else {
    tasks.push(
      { week: "Now", task: "Assess your field", detail: `Walk your land and assess current ${crop} condition. Record what you see.`, priority: "high" },
      { week: "This week", task: "Check your calendar", detail: "Identify what stage your crop should be at. Adjust tasks accordingly.", priority: "medium" },
      { week: "Ongoing", task: "Scout weekly", detail: "Walk the field at least once a week. Catching problems early is always cheaper.", priority: "medium" },
    );
  }

  return {
    summary: `Workflow for ${crop}${data.secondary ? ` + ${data.secondary}` : ""} on ${data.size || "your farm"} in ${data.region || data.country || "your area"}`,
    tasks,
  };
}

const PAGES = {
  market: { title: "Marketplace", body: "Browse available produce from verified farmers. Filter by crop, region, quantity, and delivery capability. Connect directly with sellers or place a standing order." },
  prices: { title: "Price Watch", body: "Maize — KES 3,800/90kg bag (Nakuru) ↑4% this week. Beans — KES 8,200/90kg ↑12%. Kale — KES 25/bunch, stable. Tomatoes — KES 3,500/crate ↓8%. Prices sourced from county markets and verified traders." },
  mylistings: { title: "My Listings", body: "You have no active listings. Once you harvest, list your produce here to connect with buyers. Adding photos, quantity, grade, and delivery info gets you matched faster." },
  buyers: { title: "Buyer Requests", body: "3 open requests in your area: (1) 5 tonnes maize, Grade 1, delivery to Nairobi by 15 Aug. (2) 500kg French beans, export grade, weekly supply. (3) 2 tonnes potatoes, any grade, collect from farm." },
  weather: { title: "Weather", body: "Nakuru County — 31 Jul: 24°C, overcast, 40% rain chance. Next 7 days: light rains Tue–Thu, dry weekend. Soil moisture adequate. No frost risk." },
  alerts: { title: "Alerts", body: "⚠ Maize price spike in Nairobi — consider listing. ⚠ Fall armyworm reports in neighbouring county — scout your fields. ⚠ Buyer request matches your profile — check Buyer Requests." },
  tasks: { title: "Tasks", body: "□ Complete Foreman workbook for personalised workflow · □ List 2-acre maize harvest · □ Reply to buyer inquiry #47 · □ Update farm profile with soil test results · □ Scout field for armyworm · □ Check irrigation pump · □ Renew marketplace subscription" },
  logs: { title: "Activity Log", body: "10:42 — Price alert triggered (maize). 09:15 — Buyer request #48 posted. Yesterday — Weather forecast updated. 28 Jul — Listing #12 viewed by 4 buyers." },
  settings: { title: "Settings", body: "Language: English. Units: metric. Currency: KES. Notifications: SMS + push. Location: Nakuru County, Kenya. Marketplace radius: 100 km." },
};

export default function AgriDashboard() {
  const [activePage, setActivePage] = useState(null);
  const [query, setQuery] = useState("");
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const leftTimer = useRef(null);
  const rightTimer = useRef(null);

  const [foremanStep, setForemanStep] = useState(0);
  const [foremanData, setForemanData] = useState({});
  const [foremanDone, setForemanDone] = useState(false);
  const [workflow, setWorkflow] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        setLeftOpen(false);
        setRightOpen(false);
        if (activePage) setActivePage(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activePage]);

  const openLeft = () => { clearTimeout(leftTimer.current); setLeftOpen(true); };
  const closeLeft = () => { leftTimer.current = setTimeout(() => setLeftOpen(false), 300); };
  const openRight = () => { clearTimeout(rightTimer.current); setRightOpen(true); };
  const closeRight = () => { rightTimer.current = setTimeout(() => setRightOpen(false), 300); };

  const handleNav = (id) => {
    setActivePage(id);
    setLeftOpen(false);
    setRightOpen(false);
    if (id === "foreman") {
      if (foremanDone && workflow) return;
      setForemanStep(0);
      setForemanData({});
      setForemanDone(false);
      setWorkflow(null);
    }
  };

  const goHome = () => setActivePage(null);

  const updateField = (fieldId, value) => {
    setForemanData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const nextStep = () => {
    if (foremanStep < FOREMAN_STEPS.length - 1) {
      setForemanStep((s) => s + 1);
    } else {
      setWorkflow(generateWorkflow(foremanData));
      setForemanDone(true);
    }
  };

  const prevStep = () => { if (foremanStep > 0) setForemanStep((s) => s - 1); };

  const resetForeman = () => {
    setForemanStep(0);
    setForemanData({});
    setForemanDone(false);
    setWorkflow(null);
  };

  const page = activePage && activePage !== "foreman" ? PAGES[activePage] : null;
  const isForeman = activePage === "foreman";
  const step = FOREMAN_STEPS[foremanStep];

  return (
    <div style={S.root}>
      {/* LEFT */}
      <div style={S.hoverZoneLeft} onMouseEnter={openLeft} onMouseLeave={closeLeft} />
      <nav
        style={{ ...S.sidebar, left: 0, borderRight: `1px solid ${C.border}`, transform: leftOpen ? "translateX(0)" : `translateX(-${SIDEBAR_WIDTH}px)` }}
        onMouseEnter={openLeft} onMouseLeave={closeLeft}
      >
        <div style={S.sidebarBrand}>⌾ FarmExchange</div>
        <div style={S.sidebarHeader}>Navigate</div>
        {LEFT_LINKS.map((l) => (
          <button key={l.id} style={{ ...S.navItem, ...(activePage === l.id ? S.navActive : {}) }} onClick={() => handleNav(l.id)}>
            <span style={S.navIcon}>{l.icon}</span>{l.label}
          </button>
        ))}
      </nav>

      {/* RIGHT */}
      <div style={S.hoverZoneRight} onMouseEnter={openRight} onMouseLeave={closeRight} />
      <nav
        style={{ ...S.sidebar, right: 0, left: "auto", borderLeft: `1px solid ${C.border}`, transform: rightOpen ? "translateX(0)" : `translateX(${SIDEBAR_WIDTH}px)` }}
        onMouseEnter={openRight} onMouseLeave={closeRight}
      >
        <div style={S.sidebarHeader}>Tools</div>
        {RIGHT_LINKS.map((l) => (
          <button key={l.id} style={{ ...S.navItem, ...(activePage === l.id ? S.navActive : {}), ...(l.accent ? S.navAccent : {}) }} onClick={() => handleNav(l.id)}>
            <span style={S.navIcon}>{l.icon}</span>{l.label}
            {l.count && <span style={S.badge}>{l.count}</span>}
          </button>
        ))}
      </nav>

      {/* CENTER */}
      <main style={S.center}>

        {/* FOREMAN — STEPS */}
        {isForeman && !foremanDone && (
          <div style={S.foremanWrap}>
            <button style={S.backBtn} onClick={goHome}>← Back</button>
            <div style={S.foremanBadge}>⬡ Foreman</div>
            <div style={S.progressRow}>
              {FOREMAN_STEPS.map((_, i) => (
                <div key={i} style={{ ...S.dot, ...(i === foremanStep ? S.dotNow : i < foremanStep ? S.dotDone : {}) }} />
              ))}
              <span style={S.progressLabel}>{foremanStep + 1} / {FOREMAN_STEPS.length}</span>
            </div>
            <h1 style={S.fTitle}>{step.title}</h1>
            <p style={S.fSub}>{step.subtitle}</p>
            <div style={S.fields}>
              {step.fields.map((f) => (
                <div key={f.id} style={S.fieldGroup}>
                  <label style={S.label}>{f.label}</label>
                  {f.type === "text" && (
                    <input style={S.textInput} type="text" placeholder={f.placeholder} value={foremanData[f.id] || ""} onChange={(e) => updateField(f.id, e.target.value)} />
                  )}
                  {f.type === "select" && (
                    <select style={S.selectInput} value={foremanData[f.id] || ""} onChange={(e) => updateField(f.id, e.target.value)}>
                      <option value="">Select…</option>
                      {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  {f.type === "textarea" && (
                    <textarea style={{ ...S.textInput, minHeight: 72, resize: "vertical" }} placeholder={f.placeholder} value={foremanData[f.id] || ""} onChange={(e) => updateField(f.id, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
            <div style={S.fNav}>
              {foremanStep > 0 && <button style={S.btnGhost} onClick={prevStep}>Back</button>}
              <div style={{ flex: 1 }} />
              <button style={S.btnGreen} onClick={nextStep}>
                {foremanStep < FOREMAN_STEPS.length - 1 ? "Continue" : "Generate Workflow"}
              </button>
            </div>
          </div>
        )}

        {/* FOREMAN — RESULT */}
        {isForeman && foremanDone && workflow && (
          <div style={S.foremanWrap}>
            <button style={S.backBtn} onClick={goHome}>← Back</button>
            <div style={S.foremanBadge}>⬡ Foreman — Your Workflow</div>
            <h1 style={S.fTitle}>{workflow.summary}</h1>
            <p style={S.fSub}>Generated plan based on your inputs. Update your workbook anytime as conditions change.</p>
            <div style={S.wfList}>
              {workflow.tasks.map((t, i) => (
                <div key={i} style={S.wfRow}>
                  <div style={S.wfLeft}>
                    <span style={{ ...S.wfWeek, color: t.priority === "high" ? C.accent : C.muted }}>{t.week}</span>
                  </div>
                  <div style={S.wfRight}>
                    <div style={S.wfTask}>
                      {t.priority === "high" && <span style={S.wfDot} />}
                      {t.task}
                    </div>
                    <div style={S.wfDetail}>{t.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={S.fNav}>
              <button style={S.btnGhost} onClick={resetForeman}>Start over</button>
              <div style={{ flex: 1 }} />
              <button style={S.btnGreen} onClick={goHome}>Done</button>
            </div>
          </div>
        )}

        {/* STANDARD PAGE */}
        {page && (
          <div style={S.pageWrap}>
            <button style={S.backBtn} onClick={goHome}>← Back</button>
            <h1 style={S.pageTitle}>{page.title}</h1>
            <p style={S.pageBody}>{page.body}</p>
          </div>
        )}

        {/* HOME */}
        {!activePage && (
          <div style={S.home}>
            <div style={S.greet}>
              <span style={S.greetIcon}>⌾</span>
              <h1 style={S.greetTitle}>What can I help with?</h1>
              <p style={S.greetSub}>Ask about crops, prices, weather, or your farm plan.</p>
            </div>
            <div style={S.inputWrap}>
              <textarea
                style={S.input}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question…"
                rows={1}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setQuery(""); } }}
                onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"; }}
              />
              <button style={{ ...S.sendBtn, opacity: query.trim() ? 1 : 0.3 }} disabled={!query.trim()} onClick={() => setQuery("")}>↑</button>
            </div>
            <div style={S.quick}>
              <button style={S.qBtn} onClick={() => handleNav("foreman")}>⬡ Start Foreman workbook</button>
              <button style={S.qBtn} onClick={() => handleNav("prices")}>⌗ Check prices</button>
              <button style={S.qBtn} onClick={() => handleNav("buyers")}>◌ View buyer requests</button>
            </div>
            <p style={S.hint}>Hover left or right edge for navigation.</p>
          </div>
        )}
      </main>
    </div>
  );
}

const C = {
  bg: "#0e0e0d",
  surface: "#161615",
  raised: "#1e1e1c",
  border: "#2a2a28",
  text: "#d4d3ce",
  muted: "#6e6e64",
  accent: "#5cb85c",
  accentDim: "rgba(92,184,92,0.12)",
  white: "#eeeee8",
};

const S = {
  root: { position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: C.bg, fontFamily: '-apple-system,"Segoe UI",Inter,Helvetica,Arial,sans-serif', color: C.text },

  hoverZoneLeft: { position: "fixed", top: 0, left: 0, width: HOVER_ZONE, height: "100%", zIndex: 20 },
  hoverZoneRight: { position: "fixed", top: 0, right: 0, width: HOVER_ZONE, height: "100%", zIndex: 20 },

  sidebar: { position: "fixed", top: 0, width: SIDEBAR_WIDTH, height: "100%", background: C.surface, padding: "16px 0", zIndex: 30, transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" },
  sidebarBrand: { padding: "4px 20px 16px", fontSize: 15, fontWeight: 600, color: C.accent, letterSpacing: "-0.01em" },
  sidebarHeader: { padding: "8px 20px 10px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted },

  navItem: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 20px", border: "none", background: "transparent", color: C.text, fontSize: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "background 0.12s" },
  navActive: { background: C.raised, fontWeight: 500 },
  navAccent: { color: C.accent },
  navIcon: { fontSize: 14, width: 18, textAlign: "center", opacity: 0.5 },
  badge: { marginLeft: "auto", background: C.accent, color: C.bg, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10 },

  center: { display: "flex", justifyContent: "center", alignItems: "flex-start", height: "100%", padding: "0 24px", overflowY: "auto" },

  // Home
  home: { display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 600, paddingTop: "20vh", gap: 20 },
  greet: { textAlign: "center", marginBottom: 4 },
  greetIcon: { fontSize: 28, color: C.accent, display: "block", marginBottom: 10 },
  greetTitle: { fontSize: 24, fontWeight: 500, margin: 0, letterSpacing: "-0.02em", color: C.white },
  greetSub: { fontSize: 14, color: C.muted, marginTop: 6 },
  inputWrap: { position: "relative", width: "100%" },
  input: { width: "100%", padding: "14px 48px 14px 18px", fontSize: 15, fontFamily: "inherit", border: `1px solid ${C.border}`, borderRadius: 14, background: C.raised, color: C.text, resize: "none", outline: "none", lineHeight: 1.5, boxSizing: "border-box" },
  sendBtn: { position: "absolute", right: 10, bottom: 9, width: 30, height: 30, borderRadius: "50%", border: "none", background: C.accent, color: C.bg, fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", transition: "opacity 0.15s" },
  quick: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  qBtn: { padding: "7px 14px", fontSize: 12, fontFamily: "inherit", border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", color: C.muted, cursor: "pointer" },
  hint: { fontSize: 11, color: "#3a3a34", margin: 0 },

  // Page
  pageWrap: { maxWidth: 600, width: "100%", paddingTop: 80 },
  backBtn: { border: "none", background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer", padding: "4px 0", marginBottom: 16, fontFamily: "inherit" },
  pageTitle: { fontSize: 22, fontWeight: 500, margin: "0 0 16px", color: C.white, letterSpacing: "-0.01em" },
  pageBody: { fontSize: 15, lineHeight: 1.75, color: C.text, margin: 0 },

  // Foreman
  foremanWrap: { maxWidth: 600, width: "100%", paddingTop: 60, paddingBottom: 80 },
  foremanBadge: { fontSize: 11, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 },
  progressRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: "50%", background: C.border, transition: "background 0.2s" },
  dotNow: { background: C.accent, boxShadow: `0 0 0 3px ${C.accentDim}` },
  dotDone: { background: C.accent },
  progressLabel: { marginLeft: 8, fontSize: 11, color: C.muted },

  fTitle: { fontSize: 22, fontWeight: 500, margin: "0 0 8px", color: C.white, letterSpacing: "-0.01em" },
  fSub: { fontSize: 14, color: C.muted, margin: "0 0 28px", lineHeight: 1.5 },

  fields: { display: "flex", flexDirection: "column", gap: 18 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, fontWeight: 500, color: C.muted },
  textInput: { padding: "10px 14px", fontSize: 14, fontFamily: "inherit", border: `1px solid ${C.border}`, borderRadius: 8, background: C.raised, color: C.text, outline: "none", lineHeight: 1.5, boxSizing: "border-box" },
  selectInput: { padding: "10px 14px", fontSize: 14, fontFamily: "inherit", border: `1px solid ${C.border}`, borderRadius: 8, background: C.raised, color: C.text, outline: "none", appearance: "none", boxSizing: "border-box" },

  fNav: { display: "flex", alignItems: "center", gap: 12, marginTop: 32 },
  btnGreen: { padding: "10px 24px", fontSize: 14, fontWeight: 500, fontFamily: "inherit", border: "none", borderRadius: 8, background: C.accent, color: C.bg, cursor: "pointer" },
  btnGhost: { padding: "10px 20px", fontSize: 14, fontFamily: "inherit", border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", color: C.muted, cursor: "pointer" },

  // Workflow
  wfList: { display: "flex", flexDirection: "column", gap: 0, marginTop: 8 },
  wfRow: { display: "flex", gap: 16, padding: "16px 0", borderBottom: `1px solid ${C.border}` },
  wfLeft: { width: 90, flexShrink: 0, paddingTop: 2 },
  wfWeek: { fontSize: 12, fontWeight: 600 },
  wfRight: { flex: 1 },
  wfTask: { fontSize: 15, fontWeight: 500, color: C.white, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 },
  wfDot: { width: 6, height: 6, borderRadius: "50%", background: C.accent, flexShrink: 0 },
  wfDetail: { fontSize: 13, color: C.muted, lineHeight: 1.6 },
};`



2. Left SideBar. 
- Weather 
`import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as d3 from 'd3';

// ── Configuration ──────────────────────────────────────────────────────────────

const PARAMS = [
  { id: 'temperature_2m', label: 'Temperature', unit: '°C', api: 'temperature_2m', type: 'heatmap' },
  { id: 'apparent_temperature', label: 'Feels Like', unit: '°C', api: 'apparent_temperature', type: 'heatmap' },
  { id: 'wind', label: 'Wind', unit: 'm/s', api: 'wind_speed_10m,wind_direction_10m', type: 'wind' },
  { id: 'relative_humidity_2m', label: 'Humidity', unit: '%', api: 'relative_humidity_2m', type: 'heatmap' },
  { id: 'precipitation', label: 'Precipitation', unit: 'mm', api: 'precipitation', type: 'heatmap' },
  { id: 'cloud_cover', label: 'Cloud Cover', unit: '%', api: 'cloud_cover', type: 'heatmap' },
  { id: 'surface_pressure', label: 'Pressure', unit: 'hPa', api: 'surface_pressure', type: 'heatmap' },
  { id: 'dewpoint_2m', label: 'Dew Point', unit: '°C', api: 'dewpoint_2m', type: 'heatmap' },
];

const REGIONS = [
  { id: 'europe', label: 'Europe', bounds: [[-15, 34], [45, 72]] },
  { id: 'northAmerica', label: 'N. America', bounds: [[-135, 24], [-55, 55]] },
  { id: 'asia', label: 'Asia', bounds: [[55, 5], [150, 55]] },
  { id: 'africa', label: 'Africa', bounds: [[-20, -37], [55, 38]] },
  { id: 'southAmerica', label: 'S. America', bounds: [[-85, -57], [-30, 15]] },
  { id: 'global', label: 'Global', bounds: [[-180, -60], [180, 75]] },
];

const COLOR_SCALES = {
  temperature_2m: { domain: [-25, 0, 10, 20, 30, 45], colors: ['#2b1bb0', '#0ea5e9', '#22c55e', '#eab308', '#ef4444', '#7c0a02'] },
  apparent_temperature: { domain: [-30, -5, 8, 18, 28, 45], colors: ['#1e1b8c', '#0284c7', '#16a34a', '#ca8a04', '#dc2626', '#6b0707'] },
  relative_humidity_2m: { domain: [0, 25, 50, 75, 100], colors: ['#fde68a', '#86efac', '#38bdf8', '#3b82f6', '#1e3a5f'] },
  precipitation: { domain: [0, 0.5, 2, 8, 30], colors: ['rgba(200,200,200,0)', '#93c5fd', '#3b82f6', '#6d28d9', '#c026d3'] },
  cloud_cover: { domain: [0, 25, 50, 75, 100], colors: ['#0c4a6e22', '#47556944', '#6b728077', '#94a3b8bb', '#cbd5e1ee'] },
  surface_pressure: { domain: [960, 990, 1013, 1030, 1050], colors: ['#7c3aed', '#3b82f6', '#22c55e', '#f59e0b', '#dc2626'] },
  dewpoint_2m: { domain: [-15, 0, 10, 18, 25], colors: ['#e0f2fe', '#7dd3fc', '#0ea5e9', '#0369a1', '#1e3a5f'] },
  wind_speed: { domain: [0, 5, 12, 20, 35, 55], colors: ['#94a3b8', '#22d3ee', '#22c55e', '#eab308', '#ef4444', '#d946ef'] },
};

// ── TopoJSON Decoder ───────────────────────────────────────────────────────────

function topoFeature(topology, objectName) {
  const obj = topology.objects[objectName];
  const tf = topology.transform;

  function decodeArc(index) {
    const rev = index < 0;
    const arc = topology.arcs[rev ? ~index : index];
    let x = 0, y = 0;
    const coords = arc.map(([dx, dy]) => {
      x += dx; y += dy;
      return [x * tf.scale[0] + tf.translate[0], y * tf.scale[1] + tf.translate[1]];
    });
    return rev ? coords.reverse() : coords;
  }

  function decodeRing(indices) {
    let coords = [];
    for (const idx of indices) {
      const arc = decodeArc(idx);
      coords.push(...(coords.length ? arc.slice(1) : arc));
    }
    return coords;
  }

  function decodeGeom(geom) {
    if (geom.type === 'Polygon') return { type: 'Polygon', coordinates: geom.arcs.map(decodeRing) };
    if (geom.type === 'MultiPolygon') return { type: 'MultiPolygon', coordinates: geom.arcs.map(p => p.map(decodeRing)) };
    return { type: geom.type, coordinates: [] };
  }

  const geometries = obj.type === 'GeometryCollection' ? obj.geometries : [obj];
  return {
    type: 'FeatureCollection',
    features: geometries.map(g => ({ type: 'Feature', properties: g.properties || {}, geometry: decodeGeom(g) }))
  };
}

// ── Interpolation ──────────────────────────────────────────────────────────────

function idw(px, py, points, power = 2.5) {
  let sumW = 0, sumWV = 0;
  for (const pt of points) {
    const dx = px - pt.px, dy = py - pt.py;
    const d2 = dx * dx + dy * dy;
    if (d2 < 1) return pt.value;
    const w = 1 / Math.pow(d2, power / 2);
    sumW += w;
    sumWV += w * pt.value;
  }
  return sumWV / sumW;
}

function idwVec(px, py, points, power = 2.5) {
  let sumW = 0, sumU = 0, sumV = 0;
  for (const pt of points) {
    const dx = px - pt.px, dy = py - pt.py;
    const d2 = dx * dx + dy * dy;
    if (d2 < 1) return { u: pt.u, v: pt.v };
    const w = 1 / Math.pow(d2, power / 2);
    sumW += w;
    sumU += w * pt.u;
    sumV += w * pt.v;
  }
  return { u: sumU / sumW, v: sumV / sumW };
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function WeatherMap() {
  const canvasRef = useRef(null);
  const windCanvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef(null);
  const windFieldRef = useRef(null);

  const [paramId, setParamId] = useState('temperature_2m');
  const [regionId, setRegionId] = useState('europe');
  const [geoData, setGeoData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const param = useMemo(() => PARAMS.find(p => p.id === paramId), [paramId]);
  const region = useMemo(() => REGIONS.find(r => r.id === regionId), [regionId]);

  const W = 820, H = 520;
  const GRID_X = 18, GRID_Y = 12;

  // ── Load coastlines ────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json')
      .then(r => r.json())
      .then(topo => setGeoData(topoFeature(topo, 'land')))
      .catch(() => setError('Failed to load map data'));
  }, []);

  // ── Fetch weather grid ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!region) return;
    setLoading(true);
    setError(null);

    const [[lonMin, latMin], [lonMax, latMax]] = region.bounds;
    const lats = [], lons = [];
    for (let iy = 0; iy < GRID_Y; iy++) {
      for (let ix = 0; ix < GRID_X; ix++) {
        lats.push((latMin + (latMax - latMin) * (iy + 0.5) / GRID_Y).toFixed(2));
        lons.push((lonMin + (lonMax - lonMin) * (ix + 0.5) / GRID_X).toFixed(2));
      }
    }

    const allApiFields = new Set();
    PARAMS.forEach(p => p.api.split(',').forEach(f => allApiFields.add(f)));
    const fields = [...allApiFields].join(',');

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(',')}&longitude=${lons.join(',')}&current=${fields}&timezone=auto`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [data];
        setWeatherData(arr);
        setLastUpdate(new Date().toLocaleTimeString());
        setLoading(false);
      })
      .catch(e => {
        setError('Failed to fetch weather data');
        setLoading(false);
      });
  }, [regionId]);

  // ── Build projection ───────────────────────────────────────────────────────

  const projection = useMemo(() => {
    if (!region) return null;
    const [[lonMin, latMin], [lonMax, latMax]] = region.bounds;
    return d3.geoMercator()
      .fitSize([W, H], {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[lonMin, latMin], [lonMax, latMin], [lonMax, latMax], [lonMin, latMax], [lonMin, latMin]]]
        }
      });
  }, [region]);

  // ── Render map + heatmap ───────────────────────────────────────────────────

  const renderMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !projection || !geoData) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Ocean grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    const path = d3.geoPath(projection, ctx);
    for (let lon = -180; lon <= 180; lon += 15) {
      ctx.beginPath();
      path({ type: 'LineString', coordinates: [[lon, -85], [lon, 85]] });
      ctx.stroke();
    }
    for (let lat = -75; lat <= 75; lat += 15) {
      ctx.beginPath();
      path({ type: 'LineString', coordinates: Array.from({ length: 73 }, (_, i) => [-180 + i * 5, lat]) });
      ctx.stroke();
    }

    // Weather heatmap overlay
    if (weatherData && param.type === 'heatmap') {
      const scaleConf = COLOR_SCALES[paramId];
      const colorScale = d3.scaleLinear().domain(scaleConf.domain).range(scaleConf.colors).clamp(true);

      const points = weatherData.map(d => {
        const [px, py] = projection([d.longitude, d.latitude]) || [0, 0];
        return { px, py, value: d.current?.[paramId] ?? 0 };
      }).filter(p => p.px > -50 && p.py > -50 && p.px < W + 50 && p.py < H + 50);

      const step = 6;
      const imgW = Math.ceil(W / step), imgH = Math.ceil(H / step);
      const imgData = ctx.createImageData(imgW, imgH);

      for (let y = 0; y < imgH; y++) {
        for (let x = 0; x < imgW; x++) {
          const val = idw(x * step, y * step, points);
          const c = d3.color(colorScale(val));
          if (c) {
            const i = (y * imgW + x) * 4;
            imgData.data[i] = c.r;
            imgData.data[i + 1] = c.g;
            imgData.data[i + 2] = c.b;
            imgData.data[i + 3] = paramId === 'precipitation' || paramId === 'cloud_cover' ? Math.min(220, c.opacity * 255 + 60) : 160;
          }
        }
      }

      const offscreen = document.createElement('canvas');
      offscreen.width = imgW;
      offscreen.height = imgH;
      offscreen.getContext('2d').putImageData(imgData, 0, 0);
      ctx.globalAlpha = 0.7;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(offscreen, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // Wind arrows overlay
    if (weatherData && param.type === 'wind') {
      const scaleConf = COLOR_SCALES.wind_speed;
      const colorScale = d3.scaleLinear().domain(scaleConf.domain).range(scaleConf.colors).clamp(true);

      weatherData.forEach(d => {
        const pt = projection([d.longitude, d.latitude]);
        if (!pt) return;
        const [px, py] = pt;
        if (px < 0 || py < 0 || px > W || py > H) return;

        const speed = d.current?.wind_speed_10m ?? 0;
        const dir = (d.current?.wind_direction_10m ?? 0) * Math.PI / 180;
        const len = Math.min(20, 4 + speed * 0.8);

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(dir);
        ctx.strokeStyle = colorScale(speed);
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -len);
        ctx.lineTo(0, len);
        ctx.moveTo(0, -len);
        ctx.lineTo(-3, -len + 5);
        ctx.moveTo(0, -len);
        ctx.lineTo(3, -len + 5);
        ctx.stroke();
        ctx.restore();
      });
    }

    // Coastlines
    ctx.beginPath();
    path(geoData);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.stroke();

  }, [projection, geoData, weatherData, paramId, param]);

  useEffect(() => { renderMap(); }, [renderMap]);

  // ── Wind particle animation ────────────────────────────────────────────────

  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const wCanvas = windCanvasRef.current;
    if (!wCanvas || !projection || !weatherData || param.type !== 'wind') {
      if (wCanvas) {
        const wctx = wCanvas.getContext('2d');
        wctx.clearRect(0, 0, W, H);
      }
      return;
    }

    const wctx = wCanvas.getContext('2d');
    const scaleConf = COLOR_SCALES.wind_speed;
    const colorScale = d3.scaleLinear().domain(scaleConf.domain).range(scaleConf.colors).clamp(true);

    // Build wind field from data points
    const windPoints = weatherData.map(d => {
      const pt = projection([d.longitude, d.latitude]);
      if (!pt) return null;
      const speed = d.current?.wind_speed_10m ?? 0;
      const dir = (d.current?.wind_direction_10m ?? 0) * Math.PI / 180;
      return { px: pt[0], py: pt[1], u: Math.sin(dir) * speed, v: -Math.cos(dir) * speed, speed };
    }).filter(Boolean);

    windFieldRef.current = windPoints;

    // Init particles
    const NUM = 2500;
    const particles = Array.from({ length: NUM }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      age: Math.floor(Math.random() * 80),
      maxAge: 50 + Math.floor(Math.random() * 60),
    }));
    particlesRef.current = particles;

    function animate() {
      wctx.globalCompositeOperation = 'destination-in';
      wctx.fillStyle = 'rgba(0,0,0,0.92)';
      wctx.fillRect(0, 0, W, H);
      wctx.globalCompositeOperation = 'lighter';

      for (const p of particles) {
        const wind = idwVec(p.x, p.y, windPoints);
        const speed = Math.sqrt(wind.u * wind.u + wind.v * wind.v);
        const factor = 0.35;

        const prevX = p.x, prevY = p.y;
        p.x += wind.u * factor;
        p.y += wind.v * factor;
        p.age++;

        if (p.x < 0 || p.x > W || p.y < 0 || p.y > H || p.age > p.maxAge) {
          p.x = Math.random() * W;
          p.y = Math.random() * H;
          p.age = 0;
          p.maxAge = 50 + Math.floor(Math.random() * 60);
          continue;
        }

        const alpha = Math.min(1, Math.min(p.age / 8, (p.maxAge - p.age) / 8)) * Math.min(1, speed / 3);
        wctx.strokeStyle = colorScale(speed);
        wctx.globalAlpha = alpha * 0.6;
        wctx.lineWidth = speed > 15 ? 1.5 : 1;
        wctx.beginPath();
        wctx.moveTo(prevX, prevY);
        wctx.lineTo(p.x, p.y);
        wctx.stroke();
      }

      wctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [projection, weatherData, param]);

  // ── Color legend ───────────────────────────────────────────────────────────

  const legendData = useMemo(() => {
    const key = paramId === 'wind' ? 'wind_speed' : paramId;
    const sc = COLOR_SCALES[key];
    if (!sc) return null;
    return sc;
  }, [paramId]);

  // ── Stats from data ────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (!weatherData) return null;
    const key = paramId === 'wind' ? 'wind_speed_10m' : paramId;
    const vals = weatherData.map(d => d.current?.[key]).filter(v => v != null);
    if (!vals.length) return null;
    return {
      min: Math.min(...vals).toFixed(1),
      max: Math.max(...vals).toFixed(1),
      avg: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1),
    };
  }, [weatherData, paramId]);

  // ── UI ─────────────────────────────────────────────────────────────────────

  const darkBg = '#0b1120';
  const panelBg = '#111827';
  const borderColor = '#1e293b';
  const textPrimary = '#e2e8f0';
  const textSecondary = '#94a3b8';
  const accent = '#38bdf8';

  return (
    <div style={{ background: darkBg, color: textPrimary, fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh', padding: 16, boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Weather Atlas</h1>
          <span style={{ fontSize: 11, color: textSecondary }}>Open-Meteo · Live</span>
        </div>
        {lastUpdate && <span style={{ fontSize: 11, color: textSecondary }}>Updated {lastUpdate}</span>}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {/* Region selector */}
        <div style={{ display: 'flex', gap: 3, background: panelBg, borderRadius: 8, padding: 3, border: `1px solid ${borderColor}` }}>
          {REGIONS.map(r => (
            <button
              key={r.id}
              onClick={() => setRegionId(r.id)}
              style={{
                background: regionId === r.id ? '#1e293b' : 'transparent',
                color: regionId === r.id ? accent : textSecondary,
                border: 'none',
                borderRadius: 6,
                padding: '5px 10px',
                fontSize: 12,
                fontWeight: regionId === r.id ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Parameter pills */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
        {PARAMS.map(p => (
          <button
            key={p.id}
            onClick={() => setParamId(p.id)}
            style={{
              background: paramId === p.id ? accent : panelBg,
              color: paramId === p.id ? '#0b1120' : textSecondary,
              border: `1px solid ${paramId === p.id ? accent : borderColor}`,
              borderRadius: 20,
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: paramId === p.id ? 700 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Map container */}
      <div style={{ position: 'relative', width: '100%', maxWidth: W, borderRadius: 12, overflow: 'hidden', border: `1px solid ${borderColor}`, background: '#0f172a' }}>
        <canvas ref={canvasRef} width={W} height={H} style={{ display: 'block', width: '100%', height: 'auto' }} />
        <canvas
          ref={windCanvasRef}
          width={W}
          height={H}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'auto', pointerEvents: 'none' }}
        />

        {/* Loading overlay */}
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(11,17,32,0.85)', backdropFilter: 'blur(4px)', zIndex: 10
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Fetching weather grid…</div>
              <div style={{ fontSize: 11, color: textSecondary }}>{GRID_X * GRID_Y} sample points from Open-Meteo</div>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(11,17,32,0.85)', zIndex: 10
          }}>
            <div style={{ color: '#f87171', fontSize: 14 }}>{error}</div>
          </div>
        )}

        {/* Legend */}
        {legendData && !loading && (
          <div style={{
            position: 'absolute', bottom: 12, left: 12, background: 'rgba(15,23,42,0.9)',
            borderRadius: 8, padding: '8px 12px', border: `1px solid ${borderColor}`,
            backdropFilter: 'blur(8px)', minWidth: 180,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: textSecondary }}>
              {param.label} ({param.type === 'wind' ? 'm/s' : param.unit})
            </div>
            <div style={{
              height: 10, borderRadius: 5, marginBottom: 4,
              background: `linear-gradient(to right, ${legendData.colors.join(', ')})`,
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: textSecondary }}>
              {legendData.domain.map((v, i) => <span key={i}>{v}</span>)}
            </div>
          </div>
        )}

        {/* Stats box */}
        {stats && !loading && (
          <div style={{
            position: 'absolute', top: 12, right: 12, background: 'rgba(15,23,42,0.9)',
            borderRadius: 8, padding: '8px 14px', border: `1px solid ${borderColor}`,
            backdropFilter: 'blur(8px)', display: 'flex', gap: 16, fontSize: 12,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: textSecondary }}>Min</div>
              <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{stats.min}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: textSecondary }}>Avg</div>
              <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{stats.avg}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: textSecondary }}>Max</div>
              <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{stats.max}</div>
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div style={{ marginTop: 10, fontSize: 10, color: '#475569', display: 'flex', justifyContent: 'space-between', maxWidth: W, flexWrap: 'wrap', gap: 4 }}>
        <span>Data: Open-Meteo API (free, no key) · {GRID_X}×{GRID_Y} sample grid · IDW interpolation</span>
        <span>Map: Natural Earth 110m · d3-geo Mercator</span>
      </div>
    </div>
  );
}`
-  Terrain - I want you to study this repo, and extract the terrain rendering ideas and implement them here. Users should be able to get all the soil/elevation relation information here, for their location
https://github.com/w3reality/three-geo 
- Satellites 
`<head>
  <style>
    body { margin: 0; }

    #time-log {
      position: absolute;
      font-size: 12px;
      font-family: sans-serif;
      padding: 5px;
      border-radius: 3px;
      background-color: rgba(200, 200, 200, 0.1);
      color: lavender;
      bottom: 10px;
      right: 10px;
    }
  </style>

  <script type="importmap">{ "imports": {
    "react": "https://esm.sh/react",
    "react-dom": "https://esm.sh/react-dom/client"
  }}</script>

<!--  <script type="module">import * as React from 'react'; window.React = React;</script>-->
<!--  <script src="../../dist/react-globe.gl.js" defer></script>-->
</head>

<body>
<div id="globeViz"></div>

<script src="//unpkg.com/@babel/standalone"></script>
<script type="text/jsx" data-type="module">
  import Globe from 'https://esm.sh/react-globe.gl?external=react';
  import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
  import { createRoot } from 'react-dom';
  import * as satellite from 'https://esm.sh/satellite.js';

  const EARTH_RADIUS_KM = 6371; // km
  const TIME_STEP = 3 * 1000; // per frame

  const World = () => {
    const globeEl = useRef();
    const [satData, setSatData] = useState();
    const [globeRadius, setGlobeRadius] = useState();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
      // time ticker
      (function frameTicker() {
        requestAnimationFrame(frameTicker);
        setTime(time => new Date(+time + TIME_STEP));
      })();
    }, []);

    useEffect(() => {
      // load satellite data
      fetch('//cdn.jsdelivr.net/npm/globe.gl/example/datasets/space-track-leo.txt').then(r => r.text()).then(rawData => {
        const tleData = rawData.replace(/\r/g, '')
          .split(/\n(?=[^12])/)
          .filter(d => d)
          .map(tle => tle.split('\n'));
        const satData = tleData.map(([name, ...tle]) => ({
          satrec: satellite.twoline2satrec(...tle),
          name: name.trim().replace(/^0 /, '')
        }))
        // exclude those that can't be propagated
        .filter(d => !!satellite.propagate(d.satrec, new Date())?.position);

        setSatData(satData);
      });
    }, []);

    const particlesData = useMemo(() => {
      if (!satData) return [];

      // Update satellite positions
      const gmst = satellite.gstime(time);
      return [
        satData.map(d => {
          const eci = satellite.propagate(d.satrec, time);
          if (eci?.position) {
            const gdPos = satellite.eciToGeodetic(eci.position, gmst);
            const lat = satellite.radiansToDegrees(gdPos.latitude);
            const lng = satellite.radiansToDegrees(gdPos.longitude);
            const alt = gdPos.height / EARTH_RADIUS_KM;
            return { ...d, lat, lng, alt };
          } else {
            // explicitly handle invalid position
            d.lat = NaN;
            d.lng = NaN;
            d.alt = NaN;
          }
          return d;
        }).filter(d => !isNaN(d.lat) && !isNaN(d.lng) && !isNaN(d.alt))
      ];
    }, [satData, time]);

    useEffect(() => {
      setGlobeRadius(globeEl.current.getGlobeRadius());
      globeEl.current.pointOfView({ altitude: 3.5 });
    }, []);

    return <div>
      <Globe
        ref={globeEl}
        globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg"
        particlesData={particlesData}
        particleLabel="name"
        particleLat="lat"
        particleLng="lng"
        particleAltitude="alt"
        particlesColor={useCallback(() => 'palegreen', [])}
      />
      <div id="time-log">{time.toString()}</div>
    </div>;
  };

  createRoot(document.getElementById('globeViz'))
    .render(<World />);
</script>
</body>`
- Shipping 
`<head>
  <style> body { margin: 0; } </style>

  <script type="importmap">{ "imports": {
    "react": "https://esm.sh/react",
    "react-dom": "https://esm.sh/react-dom/client"
  }}</script>

<!--  <script type="module">import * as React from 'react'; window.React = React;</script>-->
<!--  <script src="../../dist/react-globe.gl.js" defer></script>-->
</head>

<body>
<div id="globeViz"></div>

<script src="//unpkg.com/@babel/standalone"></script>
<script type="text/jsx" data-type="module">
  import Globe from 'https://esm.sh/react-globe.gl?external=react';
  import React, { useState, useEffect } from 'react';
  import { createRoot } from 'react-dom';

  const World = () => {
    const [cablePaths, setCablePaths] = useState([]);

    useEffect(() => {
      // from https://www.submarinecablemap.com
      fetch('//http-proxy.vastur.com?url=https://www.submarinecablemap.com/api/v3/cable/cable-geo.json')
        .then(r => r.json())
        .then(cablesGeo => {
          let cablePaths = [];
          cablesGeo.features.forEach(({ geometry, properties }) => {
            geometry.coordinates.forEach(coords => cablePaths.push({ coords, properties }));
          });

          setCablePaths(cablePaths);
        });
    }, []);

    return <Globe
      globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg"
      bumpImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png"
      backgroundImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png"
      pathsData={cablePaths}
      pathPoints="coords"
      pathPointLat={p => p[1]}
      pathPointLng={p => p[0]}
      pathColor={path => path.properties.color}
      pathLabel={path => path.properties.name}
      pathDashLength={0.1}
      pathDashGap={0.008}
      pathDashAnimateTime={12000}
    />;
  };

  createRoot(document.getElementById('globeViz'))
    .render(<World />);
</script>
</body>`
- Flights 
`<head>
  <style> body { margin: 0; } </style>

  <script type="importmap">{ "imports": {
    "react": "https://esm.sh/react",
    "react-dom": "https://esm.sh/react-dom/client"
  }}</script>

<!--  <script type="module">import * as React from 'react'; window.React = React;</script>-->
<!--  <script src="../../dist/react-globe.gl.js" defer></script>-->
</head>

<body>
<div id="globeViz"></div>

<script src="//unpkg.com/@babel/standalone"></script>
<script type="text/jsx" data-type="module">
  import Globe from 'https://esm.sh/react-globe.gl?external=react';
  import React, { useState, useEffect, useRef } from 'react';
  import { createRoot } from 'react-dom';
  import { csvParseRows } from 'https://esm.sh/d3-dsv';
  import indexBy from 'https://esm.sh/index-array-by';

  const COUNTRY = 'United States';
  const OPACITY = 0.22;

  const airportParse = ([airportId, name, city, country, iata, icao, lat, lng, alt, timezone, dst, tz, type, source]) => ({ airportId, name, city, country, iata, icao, lat, lng, alt, timezone, dst, tz, type, source });
  const routeParse = ([airline, airlineId, srcIata, srcAirportId, dstIata, dstAirportId, codeshare, stops, equipment]) => ({ airline, airlineId, srcIata, srcAirportId, dstIata, dstAirportId, codeshare, stops, equipment});

  const World = () => {
    const globeEl = useRef();
    const [airports, setAirports] = useState([]);
    const [routes, setRoutes] = useState([]);

    useEffect(() => {
      // load data
      Promise.all([
        fetch('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat').then(res => res.text())
          .then(d => csvParseRows(d, airportParse)),
        fetch('https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat').then(res => res.text())
          .then(d => csvParseRows(d, routeParse))
      ]).then(([airports, routes]) => {

        const byIata = indexBy(airports, 'iata', false);

        const filteredRoutes = routes
          .filter(d => byIata.hasOwnProperty(d.srcIata) && byIata.hasOwnProperty(d.dstIata)) // exclude unknown airports
          .filter(d => d.stops === '0') // non-stop flights only
          .map(d => Object.assign(d, {
            srcAirport: byIata[d.srcIata],
            dstAirport: byIata[d.dstIata]
          }))
          .filter(d => d.srcAirport.country === COUNTRY && d.dstAirport.country !== COUNTRY); // international routes from country

        setAirports(airports);
        setRoutes(filteredRoutes);
      });
    }, []);

    useEffect(() => {
      // aim at continental US centroid
      globeEl.current.pointOfView({ lat: 39.6, lng: -98.5, altitude: 2 });
    }, []);

    return <Globe
      ref={globeEl}
      globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg"

      arcsData={routes}
      arcLabel={d => `${d.airline}: ${d.srcIata} &#8594; ${d.dstIata}`}
      arcStartLat={d => +d.srcAirport.lat}
      arcStartLng={d => +d.srcAirport.lng}
      arcEndLat={d => +d.dstAirport.lat}
      arcEndLng={d => +d.dstAirport.lng}
      arcDashLength={0.25}
      arcDashGap={1}
      arcDashInitialGap={() => Math.random()}
      arcDashAnimateTime={4000}
      arcColor={d => [`rgba(0, 255, 0, ${OPACITY})`, `rgba(255, 0, 0, ${OPACITY})`]}
      arcsTransitionDuration={0}

      pointsData={airports}
      pointColor={() => 'orange'}
      pointAltitude={0}
      pointRadius={0.02}
      pointsMerge={true}
    />;
  };

  createRoot(document.getElementById('globeViz'))
    .render(<World />);
</script>
</body>`
- GPS
- Atmosphere
- Economics
- Traffic


3. Right Sidebar
- Knowledge Graph
- Predictions
- 