import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight, CircleHelp, GitBranch, Maximize2, Minus, Plus, RotateCcw, Sparkles } from "lucide-react";

const nodes = [
  { id: "CLAUSE 04", title: "Rent", x: "9%", y: "15%", tone: "neutral" },
  { id: "CLAUSE 07", title: "Renewal", x: "9%", y: "62%", tone: "neutral" },
  { id: "CLAUSE 12", title: "Termination", x: "39%", y: "34%", tone: "coral", active: true },
  { id: "CLAUSE 18", title: "Deposit", x: "72%", y: "13%", tone: "amber" },
  { id: "CLAUSE 21", title: "Penalty", x: "72%", y: "61%", tone: "coral" },
  { id: "CLAUSE 24", title: "Disputes", x: "39%", y: "78%", tone: "lime" },
];

export default function ClauseGraph() {
  const [selected, setSelected] = useState("CLAUSE 12");
  const selectedNode = nodes.find((node) => node.id === selected) ?? nodes[2];
  return (
    <div className="page-content page-enter graph-page">
      <div className="page-header"><div><div className="eyebrow"><span className="eyebrow-line" /> RELATIONSHIP ENGINE</div><h1>See the <span className="lime-dot">chain reaction.</span></h1><p>Explore how one clause can trigger rights, obligations, and financial consequences elsewhere.</p></div><button className="ghost-button"><CircleHelp size={15} /> How this works</button></div>
      <div className="graph-stats"><div><GitBranch size={16} /><span>24 nodes</span></div><div><ArrowDownRight size={16} /><span>17 direct edges</span></div><div><Sparkles size={16} /><span>6 inferred dependencies</span></div><div className="graph-status"><i /> Graph is live</div></div>
      <div className="graph-workspace"><section className="panel full-graph-panel"><div className="full-graph-toolbar"><span><i /> INTERACTIVE CLAUSE DAG</span><div><button onClick={() => window.alert("Graph zoom reset.")}><RotateCcw size={14} /></button><button><Minus size={14} /></button><button><Plus size={14} /></button><button><Maximize2 size={14} /></button></div></div><div className="full-graph-canvas"><svg className="full-graph-lines" viewBox="0 0 900 610" preserveAspectRatio="none" aria-hidden="true"><path d="M185 126 C290 126, 280 255, 390 255" /><path d="M185 400 C280 400, 305 291, 390 291" /><path d="M470 274 C575 274, 585 144, 700 144" /><path d="M470 295 C580 295, 590 410, 700 410" /><path d="M430 328 C435 425, 430 454, 425 493" /><path className="dashed" d="M235 426 C390 560, 555 545, 710 432" /></svg>{nodes.map((node) => <button key={node.id} className={`full-node ${node.tone} ${selected === node.id ? "node-active" : ""}`} style={{ left: node.x, top: node.y }} onClick={() => setSelected(node.id)}><span>{node.id}</span><strong>{node.title}</strong><small>{node.tone === "coral" ? "High impact" : node.tone === "amber" ? "Review" : "Referenced"}</small></button>)}<div className="full-graph-legend"><span><i className="solid-line" /> Explicit connection</span><span><i className="dashed-line" /> Inferred relationship</span><span><i className="node-key coral-key" /> High risk</span><span><i className="node-key amber-key" /> Medium risk</span></div></div></section><aside className="panel graph-inspector"><div className="section-kicker">SELECTED NODE</div><div className={`inspector-icon ${selectedNode.tone}`}><GitBranch size={19} /></div><span className="detail-id">{selectedNode.id}</span><h2>{selectedNode.title}</h2><p>Primary relationship hub for the agreement’s exit and penalty pathway.</p><div className="inspector-stat"><span>CONNECTED TO</span><strong>03 clauses</strong></div><div className="inspector-stat"><span>IMPACT LEVEL</span><strong className={selectedNode.tone === "coral" ? "coral-text" : "lime-text"}>{selectedNode.tone === "coral" ? "High" : "Moderate"}</strong></div><div className="inspector-connections"><span className="detail-section-label">OUTBOUND PATH</span><button><span className="tiny-node coral" /> Clause 21 · Penalty <ChevronRight size={14} /></button><button><span className="tiny-node amber" /> Clause 18 · Deposit <ChevronRight size={14} /></button></div><button className="detail-action">Open clause detail <ArrowUpRight size={14} /></button></aside></div>
    </div>
  );
}
