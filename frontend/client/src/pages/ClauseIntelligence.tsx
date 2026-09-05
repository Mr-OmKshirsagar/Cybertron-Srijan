import { useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronRight, CircleAlert, FileText, Search, SlidersHorizontal, Sparkles } from "lucide-react";

const clauses = [
  { id: "CLAUSE 04", title: "Rent and payment schedule", category: "Financial", risk: "LOW", page: "2", score: 22, text: "The Tenant shall pay monthly rent of ₹25,000 on or before the fifth day of each calendar month." },
  { id: "CLAUSE 06", title: "Security deposit", category: "Deposit", risk: "MEDIUM", page: "3", score: 48, text: "The security deposit shall be held by the Landlord and returned subject to deductions permitted under this agreement." },
  { id: "CLAUSE 07", title: "Renewal and continuation", category: "Term", risk: "MEDIUM", page: "4", score: 41, text: "The agreement may be renewed by mutual written consent at least thirty days before the expiry date." },
  { id: "CLAUSE 12", title: "Termination and notice period", category: "Termination", risk: "HIGH", page: "5", score: 82, text: "Either party may terminate this agreement by providing a 60-day written notice to the other party." },
  { id: "CLAUSE 18", title: "Security deposit deductions", category: "Deposit", risk: "MEDIUM", page: "7", score: 57, text: "Deductions from the deposit may be made for structural damage, unpaid dues, or restoration beyond ordinary wear." },
  { id: "CLAUSE 21", title: "Early exit penalty", category: "Financial", risk: "HIGH", page: "8", score: 91, text: "Early termination without the required notice may result in a penalty equivalent to ₹20,000." },
  { id: "CLAUSE 24", title: "Dispute resolution", category: "Liability", risk: "LOW", page: "11", score: 28, text: "Parties shall first attempt to resolve disputes through written communication before escalation." },
];

export default function ClauseIntelligence() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All clauses");
  const [selected, setSelected] = useState("CLAUSE 12");
  const selectedClause = clauses.find((clause) => clause.id === selected) ?? clauses[3];
  const visibleClauses = useMemo(() => clauses.filter((clause) => {
    const matchesQuery = `${clause.id} ${clause.title} ${clause.category}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "All clauses" || clause.risk === filter.toUpperCase() || clause.category === filter;
    return matchesQuery && matchesFilter;
  }), [filter, query]);

  return (
    <div className="page-content page-enter">
      <div className="page-header"><div><div className="eyebrow"><span className="eyebrow-line" /> DOCUMENT INTELLIGENCE</div><h1>Every clause, <span className="lime-dot">made legible.</span></h1><p>Search the agreement by meaning, risk, or consequence—not just keywords.</p></div><button className="ghost-button"><ArrowUpRight size={15} /> Export analysis</button></div>
      <div className="intelligence-summary"><div><span className="summary-label">CLAUSES ANALYZED</span><strong>24</strong><small>Across 18 pages</small></div><div><span className="summary-label">HIGH RISK</span><strong className="coral-text">03</strong><small>Require attention</small></div><div><span className="summary-label">CONNECTED EDGES</span><strong className="lime-text">17</strong><small>Graph relationships</small></div><div><span className="summary-label">LAST SYNC</span><strong className="summary-time">2m</strong><small>Session-scoped index</small></div></div>
      <div className="intelligence-layout">
        <section className="panel clause-browser"><div className="browser-toolbar"><div className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clauses, obligations, amounts…" /></div><button className="filter-button"><SlidersHorizontal size={14} /> Filters <ChevronDown size={13} /></button></div><div className="filter-pills">{["All clauses", "High", "Medium", "Low", "Financial", "Termination"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="clause-browser-head"><span>CLAUSE / TITLE</span><span>RISK</span><span>PAGE</span></div><div className="clause-browser-list">{visibleClauses.map((clause) => <button key={clause.id} className={`browser-row ${selected === clause.id ? "selected" : ""}`} onClick={() => setSelected(clause.id)}><div className={`browser-risk-bar ${clause.risk.toLowerCase()}`} /><div className="browser-clause-copy"><span>{clause.id} · {clause.category}</span><strong>{clause.title}</strong><small>{clause.text}</small></div><span className={`risk-label-badge ${clause.risk.toLowerCase()}`}>{clause.risk}</span><span className="page-number">p. {clause.page}</span><ChevronRight size={15} /></button>)}{visibleClauses.length === 0 && <div className="empty-search"><Search size={18} /><strong>No clauses match that search.</strong><span>Try a different phrase or clear the filters.</span></div>}</div></section>
        <aside className="panel clause-detail"><div className="detail-top"><span className={`risk-label-badge ${selectedClause.risk.toLowerCase()}`}>{selectedClause.risk} RISK</span><button><Sparkles size={14} /> Explain</button></div><span className="detail-id">{selectedClause.id} · PAGE {selectedClause.page}</span><h2>{selectedClause.title}</h2><p className="detail-quote">“{selectedClause.text}”</p><div className="detail-score"><div><span>EXPOSURE SCORE</span><strong>{selectedClause.score}<small>/100</small></strong></div><div className="detail-score-track"><i style={{ width: `${selectedClause.score}%` }} /></div></div><div className="detail-section"><span className="detail-section-label">PLAIN-LANGUAGE READ</span><p>This clause gives either party a defined exit path, but your notice obligation is strict. Missing the 60-day window can activate a separate financial penalty.</p></div><div className="detail-section"><span className="detail-section-label">CONNECTED CLAUSES</span><div className="connected-clause"><span>CLAUSE 07</span><strong>Renewal</strong><ChevronRight size={14} /></div><div className="connected-clause"><span>CLAUSE 21</span><strong>Early exit penalty</strong><ChevronRight size={14} /></div></div><button className="detail-action"><FileText size={15} /> Open in grounding document <ArrowUpRight size={14} /></button></aside>
      </div>
    </div>
  );
}
