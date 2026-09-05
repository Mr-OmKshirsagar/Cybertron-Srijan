import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileCheck2,
  FileText,
  Info,
  Mic,
  MoreHorizontal,
  Play,
  Plus,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Volume2,
  WalletCards,
  X,
} from "lucide-react";

type HomeProps = { onUpload: () => void };

type MetricProps = {
  label: string;
  value: string;
  detail: string;
  tone: "lime" | "coral" | "white";
  trend?: "up" | "down";
  delay: number;
};

const clauses = [
  { id: "CLAUSE 12", title: "Termination + notice period", meta: "p. 5 · HIGH RISK", tag: "Action required", tone: "coral", active: true },
  { id: "CLAUSE 18", title: "Security deposit deductions", meta: "p. 7 · MEDIUM RISK", tag: "Review", tone: "amber", active: false },
  { id: "CLAUSE 21", title: "Early exit penalty", meta: "p. 8 · HIGH RISK", tag: "Connected", tone: "coral", active: false },
];

function AnimatedMetric({ label, value, detail, tone, trend, delay }: MetricProps) {
  const [shown, setShown] = useState("0");
  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  const prefix = value.startsWith("₹") ? "₹" : "";
  const suffix = value.includes("%") ? "%" : "";

  useEffect(() => {
    let frame = 0;
    const start = performance.now() + delay;
    const animate = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - start) / 900));
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = numeric * eased;
      setShown(current >= 1000 ? Math.round(current).toLocaleString("en-IN") : current.toFixed(numeric % 1 ? 1 : 0));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [delay, numeric]);

  return (
    <article className={`metric-card ${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="metric-topline"><span>{label}</span><span className="metric-live"><i /> live</span></div>
      <div className="metric-number">{prefix}{shown}{suffix}</div>
      <div className="metric-detail">{trend && (trend === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />)}<span>{detail}</span></div>
    </article>
  );
}

function RiskBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="risk-row">
      <div className="risk-label"><span>{label}</span><strong>{value}%</strong></div>
      <div className="risk-track"><div className={`risk-fill ${tone}`} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function ClauseNode({ label, title, x, y, tone, active }: { label: string; title: string; x: string; y: string; tone: string; active?: boolean }) {
  return (
    <div className={`clause-node ${tone} ${active ? "node-active" : ""}`} style={{ left: x, top: y }}>
      <span>{label}</span><strong>{title}</strong>
    </div>
  );
}

function ClauseGraph() {
  return (
    <div className="graph-shell">
      <div className="graph-toolbar"><span className="graph-dot" /> Live relationship map <div className="graph-actions"><button>−</button><button>+</button><button><MoreHorizontal size={15} /></button></div></div>
      <div className="graph-canvas">
        <svg className="graph-lines" viewBox="0 0 660 270" preserveAspectRatio="none" aria-hidden="true">
          <path d="M150 86 C220 86, 250 122, 300 122" />
          <path d="M365 125 C430 125, 440 73, 505 73" />
          <path d="M365 140 C430 140, 443 200, 505 200" />
          <path className="dashed" d="M170 95 C270 215, 397 230, 505 205" />
        </svg>
        <ClauseNode label="CLAUSE 07" title="Renewal" x="7%" y="23%" tone="neutral" />
        <ClauseNode label="CLAUSE 12" title="Termination" x="40%" y="35%" tone="coral" active />
        <ClauseNode label="CLAUSE 18" title="Deposit" x="73%" y="6%" tone="amber" />
        <ClauseNode label="CLAUSE 21" title="Penalty" x="73%" y="55%" tone="coral" />
        <span className="graph-legend"><i className="legend-solid" /> Direct trigger <i className="legend-dashed" /> Implied dependency</span>
      </div>
    </div>
  );
}

export default function Home({ onUpload }: HomeProps) {
  const [activeClause, setActiveClause] = useState("CLAUSE 12");
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatSent, setChatSent] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ledgerTab, setLedgerTab] = useState<"mandatory" | "contingent">("mandatory");
  const [taskDone, setTaskDone] = useState(false);

  const greeting = useMemo(() => chatSent ? "The 60-day notice obligation is in Clause 12. If notice is missed, Clause 21 connects to a ₹20,000 early exit penalty. The document does not state a grace period." : "Ask a grounded question about your contract. I’ll cite the exact clause and page, then map connected obligations.", [chatSent]);

  const sendQuestion = () => {
    if (!chatQuestion.trim()) return;
    setChatSent(true);
    setChatQuestion("");
  };

  return (
    <div className="dashboard-content">
      <section className="hero-row animate-in">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> CONTRACT PULSE · 05 SEP 2026</div>
          <h1>Good morning, Om<span className="lime-dot">.</span></h1>
          <p className="hero-subtitle">Your agreement has been translated into <strong>decision-ready intelligence.</strong></p>
        </div>
        <div className="hero-actions"><button className="ghost-button" onClick={() => window.alert("Shareable report link will be available after the backend is connected.")}><ArrowUpRight size={15} /> Share report</button><button className="lime-button" onClick={onUpload}><Plus size={17} /> Analyze document</button></div>
      </section>

      <section className="document-banner animate-in delay-1">
        <div className="document-icon"><FileCheck2 size={21} /></div>
        <div className="document-info"><div className="document-name">Residential Rental Agreement <span className="status-badge"><i /> Analyzed</span></div><div className="document-meta"><span>Uploaded 04 Sep 2026</span><span>·</span><span>18 pages</span><span>·</span><span>24 clauses mapped</span></div></div>
        <div className="document-privacy"><span className="privacy-mini">⌁</span> Session-scoped <ChevronRight size={15} /></div>
      </section>

      <section className="metrics-grid animate-in delay-2">
        <AnimatedMetric label="Overall exposure" value="68" detail="↑ 12 pts since last scan" tone="coral" trend="up" delay={120} />
        <AnimatedMetric label="Fairness index" value="72" detail="Landlord-biased · moderate" tone="lime" trend="down" delay={180} />
        <AnimatedMetric label="Financial exposure" value="₹45,000" detail="₹20k contingent · ₹25k stated" tone="white" delay={240} />
        <article className="metric-card deadline-card" style={{ animationDelay: "300ms" }}><div className="metric-topline"><span>Next obligation</span><span className="deadline-chip">IN 146 DAYS</span></div><div className="deadline-date">30 <span>JAN<br />2027</span></div><div className="metric-detail"><Clock3 size={14} /><span>Serve termination notice · Clause 12</span></div></article>
      </section>

      <section className="main-grid animate-in delay-3">
        <div className="panel risk-panel">
          <div className="panel-heading"><div><span className="section-kicker">01 · Risk scorecard</span><h2>Where you carry the weight</h2></div><button className="panel-menu" aria-label="Risk panel actions"><MoreHorizontal size={18} /></button></div>
          <div className="risk-summary"><div className="risk-gauge"><svg viewBox="0 0 120 70" aria-hidden="true"><path className="gauge-bg" d="M15 60 A45 45 0 0 1 105 60" /><path className="gauge-fill" d="M15 60 A45 45 0 0 1 105 60" /></svg><strong>68</strong><span>/ 100</span></div><div className="risk-verdict"><span className="risk-pill">Elevated exposure</span><p>Three clauses need your attention before the next renewal window.</p></div></div>
          <div className="risk-bars"><RiskBar label="Termination" value={82} tone="coral-fill" /><RiskBar label="Financial" value={74} tone="coral-fill" /><RiskBar label="Liability" value={48} tone="amber-fill" /><RiskBar label="Deposit" value={31} tone="lime-fill" /></div>
          <div className="risk-footnote"><Info size={14} /> Score is calculated from explicit penalties, unilateral rights, and notice constraints.</div>
        </div>

        <div className="panel obligations-panel">
          <div className="panel-heading"><div><span className="section-kicker">02 · Obligation grid</span><h2>Who owes what</h2></div><button className="text-link">View all <ChevronRight size={14} /></button></div>
          <div className="obligation-head"><span>YOUR SIDE</span><span>COUNTERPARTY</span></div>
          <div className="obligation-row"><div><span className="obligation-icon coral-bg"><CircleAlert size={15} /></span><div><strong>60-day written notice</strong><small>Clause 12 · before exit</small></div></div><div><Check size={15} className="check-icon" /><span>Maintain premises</span></div></div>
          <div className="obligation-row"><div><span className="obligation-icon amber-bg"><WalletCards size={15} /></span><div><strong>₹20,000 exit fee</strong><small>Clause 21 · if early</small></div></div><div><Check size={15} className="check-icon" /><span>Return deposit in 30 days</span></div></div>
          <div className="obligation-row"><div><span className="obligation-icon lime-bg"><FileText size={15} /></span><div><strong>Monthly rent · ₹25,000</strong><small>Clause 04 · recurring</small></div></div><div><CircleAlert size={15} className="warn-icon" /><span>Unilateral rent revision</span></div></div>
          <button className="expand-button">Expand obligation grid <ArrowUpRight size={14} /></button>
        </div>
      </section>

      <section className="lower-grid animate-in delay-4">
        <div className="panel graph-panel"><div className="panel-heading"><div><span className="section-kicker">03 · Clause relationship map</span><h2>Nothing exists in isolation</h2></div><button className="text-link">Open graph <ArrowUpRight size={14} /></button></div><ClauseGraph /></div>
        <div className="panel clause-panel"><div className="panel-heading"><div><span className="section-kicker">04 · Attention queue</span><h2>Clauses worth a closer look</h2></div><span className="queue-count">03</span></div><div className="clause-list">{clauses.map((clause) => <button key={clause.id} className={`clause-item ${activeClause === clause.id ? "selected" : ""}`} onClick={() => setActiveClause(clause.id)}><div className={`clause-severity ${clause.tone}`} /><div className="clause-item-copy"><span>{clause.id} · {clause.meta}</span><strong>{clause.title}</strong><small className={clause.tone}>{clause.tag}</small></div><ChevronRight size={16} /></button>)}</div><button className="expand-button">View all 24 clauses <ArrowUpRight size={14} /></button></div>
      </section>

      <section className="bottom-grid animate-in delay-5">
        <div className="panel ledger-panel"><div className="panel-heading"><div><span className="section-kicker">05 · Financial ledger</span><h2>What this contract can cost</h2></div><button className="download-button" onClick={() => window.alert("Ledger export will be available after the backend is connected.")}>Export CSV <ArrowUpRight size={14} /></button></div><div className="ledger-tabs"><button className={ledgerTab === "mandatory" ? "active" : ""} onClick={() => setLedgerTab("mandatory")}>Stated commitments <span>02</span></button><button className={ledgerTab === "contingent" ? "active" : ""} onClick={() => setLedgerTab("contingent")}>Contingent penalties <span>01</span></button></div>{ledgerTab === "mandatory" ? <div className="ledger-table"><div className="ledger-line ledger-head"><span>ITEM</span><span>FREQUENCY</span><span>AMOUNT</span></div><div className="ledger-line"><span><strong>Monthly rent</strong><small>Clause 04 · p. 2</small></span><span>Monthly</span><strong>₹25,000</strong></div><div className="ledger-line"><span><strong>Security deposit</strong><small>Clause 06 · p. 3</small></span><span>One-time</span><strong>₹25,000</strong></div></div> : <div className="contingent-empty"><div className="empty-spark"><Sparkles size={18} /></div><strong>₹20,000 possible exposure</strong><span>Early exit penalty · Clause 21 · Triggered if notice window is missed.</span></div>}</div>
        <div className="panel timeline-panel"><div className="panel-heading"><div><span className="section-kicker">06 · Deadline radar</span><h2>Don’t miss the moment</h2></div><button className="text-link">Manage <ArrowUpRight size={14} /></button></div><div className="timeline-item"><div className="timeline-marker active" /><div className="timeline-copy"><span>30 JAN 2027 · 18:30 IST</span><strong>Serve 60-day termination notice</strong><small>3 reminders scheduled · Clause 12</small></div><button className={`task-toggle ${taskDone ? "done" : ""}`} onClick={() => setTaskDone(!taskDone)}>{taskDone ? <Check size={15} /> : <span />}</button></div><div className="timeline-item muted-timeline"><div className="timeline-marker" /><div className="timeline-copy"><span>01 MAR 2027 · ESTIMATED</span><strong>Deposit return window opens</strong><small>Based on Clause 18 · 30-day window</small></div><span className="timeline-locked">AUTO</span></div></div>
      </section>

      <section className="copilot-panel animate-in delay-6"><div className="copilot-intro"><div className="copilot-orb"><Sparkles size={19} /></div><div><span className="section-kicker">07 · Grounded copilot</span><h2>Ask the contract anything<span className="lime-dot">.</span></h2><p>{greeting}</p></div></div><div className={`copilot-answer ${chatSent ? "answer-visible" : ""}`}>{chatSent && <><div className="answer-meta"><span className="answer-badge"><Sparkles size={12} /> Grounded answer</span><span>2 clauses connected · 0.94 confidence</span></div><p>{greeting}</p><div className="citation-row"><span>[CLAUSE 12 · P. 5]</span><span>[CLAUSE 21 · P. 8]</span><button onClick={() => setPlaying(!playing)}>{playing ? <Volume2 size={14} /> : <Play size={14} />} {playing ? "Playing voice brief" : "Hear answer"}</button></div></>}</div><div className="copilot-input"><input value={chatQuestion} onChange={(event) => setChatQuestion(event.target.value)} onKeyDown={(event) => event.key === "Enter" && sendQuestion()} placeholder="e.g. Can the deposit be withheld for repainting?" aria-label="Ask LegalLens" /><button className="voice-button" onClick={() => window.alert("Voice input is ready for the Web Speech API integration.")} aria-label="Use voice"><Mic size={17} /></button><button className="send-button" onClick={sendQuestion} aria-label="Send question"><Send size={16} /></button></div><div className="suggestion-row"><button onClick={() => setChatQuestion("What happens if I leave before the lease ends?")}>Early exit scenario <ChevronRight size={13} /></button><button onClick={() => setChatQuestion("Which clauses are landlord-biased?")}>Bias check <ChevronRight size={13} /></button><button onClick={() => setChatQuestion("When do I get my deposit back?")}>Deposit timeline <ChevronRight size={13} /></button></div></section>

      <footer className="dashboard-footer"><span><span className="footer-mark">◌</span> LegalLens / Private intelligence layer</span><span>All analysis is grounded in your uploaded document · <button onClick={() => window.alert("Privacy policy placeholder.")}>Privacy promise</button></span></footer>
    </div>
  );
}
