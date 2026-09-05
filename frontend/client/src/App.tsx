import { useState, useRef } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronDown,
  Command,
  FileText,
  LayoutDashboard,
  Loader2,
  Network,
  Settings2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import Home from "./pages/Home";
import ClauseIntelligence from "./pages/ClauseIntelligence";
import ClauseGraph from "./pages/ClauseGraph";
import Reminders from "./pages/Reminders";
import Settings from "./pages/Settings";
import { DocumentProvider, useDocument } from "./contexts/DocumentContext";

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Clause intelligence", icon: FileText },
  { label: "Clause graph", icon: Network },
];

function AppContent() {
  const {
    documentData,
    isAnalyzing,
    uploadProgress,
    uploadStage,
    uploadError,
    tasks,
    uploadDocument,
  } = useDocument();

  const [activeNav, setActiveNav] = useState(() => {
    const path = window.location.pathname;
    if (path === "/clause-intelligence") return "Clause intelligence";
    if (path === "/clause-graph") return "Clause graph";
    if (path === "/reminders") return "Reminders";
    if (path === "/settings") return "Settings";
    return "Overview";
  });

  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("om.mehta@example.com");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = (label: string) => {
    setActiveNav(label);
    window.history.replaceState(
      {},
      "",
      label === "Overview" ? "/" : `/${label.toLowerCase().replaceAll(" ", "-")}`
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const startAnalysis = async () => {
    if (!selectedFile) return;
    const success = await uploadDocument(selectedFile, recipientEmail);
    if (success) {
      setTimeout(() => {
        setShowUpload(false);
        setSelectedFile(null);
        navigate("Overview");
      }, 700);
    }
  };

  const page =
    activeNav === "Clause intelligence" ? (
      <ClauseIntelligence />
    ) : activeNav === "Clause graph" ? (
      <ClauseGraph />
    ) : activeNav === "Reminders" ? (
      <Reminders />
    ) : activeNav === "Settings" ? (
      <Settings />
    ) : (
      <Home onUpload={() => setShowUpload(true)} />
    );

  const pendingTasksCount = tasks.filter((t) => t.status !== "COMPLETED").length;
  const graphNodeCount = documentData.dag?.nodes?.length || 24;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <ShieldCheck size={17} strokeWidth={2.4} />
          </div>
          <div>
            <span className="brand-name">LegalLens</span>
            <span className="brand-subtitle">Contract intelligence</span>
          </div>
        </div>

        <div className="workspace-switcher" title={documentData.documentName}>
          <div className="workspace-avatar">OM</div>
          <div className="workspace-copy">
            <span>{documentData.documentName || "Om Workspace"}</span>
            <small>{documentData.summary?.documentType || "Personal workspace"}</small>
          </div>
          <ChevronDown size={15} className="muted-icon" />
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <span className="nav-section-label">Workspace</span>
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? "active" : ""}`}
              onClick={() => navigate(label)}
            >
              <Icon size={16} strokeWidth={1.9} />
              <span>{label}</span>
              {label === "Clause graph" && (
                <span className="nav-count">{graphNodeCount}</span>
              )}
            </button>
          ))}
          <span className="nav-section-label nav-section-spaced">Tools</span>
          <button className="nav-item" onClick={() => setShowUpload(true)}>
            <UploadCloud size={16} strokeWidth={1.9} />
            <span>Analyze a document</span>
            <span className="nav-shortcut">⌘ U</span>
          </button>
          <button
            className={`nav-item ${activeNav === "Reminders" ? "active" : ""}`}
            onClick={() => navigate("Reminders")}
          >
            <Bell size={16} strokeWidth={1.9} />
            <span>Reminders</span>
            {pendingTasksCount > 0 && <span className="nav-dot" />}
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="privacy-seal">
            <div className="privacy-icon">
              <ShieldCheck size={15} />
            </div>
            <div>
              <strong>Private by design</strong>
              <span>Session expires in 23h 59m</span>
            </div>
          </div>
          <button
            className={`nav-item settings-item ${
              activeNav === "Settings" ? "active" : ""
            }`}
            onClick={() => navigate("Settings")}
          >
            <Settings2 size={16} strokeWidth={1.9} />
            <span>Settings</span>
          </button>
          <div className="user-row">
            <div className="user-avatar">OM</div>
            <div className="user-copy">
              <strong>Om Mehta</strong>
              <span>Owner</span>
            </div>
            <Command size={14} className="muted-icon" />
          </div>
        </div>
      </aside>

      <main className="main-canvas">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{activeNav}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              onClick={() => navigate("Clause intelligence")}
            >
              <Command size={14} />
              <span>Search clauses</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() => navigate("Reminders")}
            >
              <Bell size={17} />
              {pendingTasksCount > 0 && <span className="notification-pip" />}
            </button>
            <button className="top-avatar">OM</button>
          </div>
        </header>
        {page}
      </main>

      {showUpload && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-title"
          onClick={() => !isAnalyzing && setShowUpload(false)}
        >
          <div className="upload-modal" onClick={(event) => event.stopPropagation()}>
            {!isAnalyzing && (
              <button
                className="modal-close"
                onClick={() => setShowUpload(false)}
                aria-label="Close"
              >
                ×
              </button>
            )}
            <div className="modal-eyebrow">
              <Sparkles size={14} /> In-Memory Ingestion Pipeline
            </div>
            <h2 id="upload-title">Bring a contract into focus.</h2>
            <p>
              Drop a PDF, DOCX, or image here. Your document stays strictly in RAM buffer
              and is automatically purged after the session.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.txt"
              onChange={handleFileChange}
            />

            <div
              className={`dropzone ${isDragOver ? "dragover" : ""} ${
                selectedFile ? "file-ready" : ""
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !isAnalyzing && fileInputRef.current?.click()}
              style={{ cursor: isAnalyzing ? "wait" : "pointer" }}
            >
              {isAnalyzing ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                  <Loader2 size={32} className="animate-spin text-lime" />
                  <strong>{uploadStage || "Processing..."}</strong>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: "280px",
                      height: "6px",
                      background: "#1e293b",
                      borderRadius: "9999px",
                      overflow: "hidden",
                      marginTop: "6px",
                    }}
                  >
                    <div
                      style={{
                        width: `${uploadProgress}%`,
                        height: "100%",
                        background: "#bef264",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "12px", color: "#8b949e" }}>
                    {uploadProgress}% complete · Zero persistent file storage
                  </span>
                </div>
              ) : selectedFile ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <CheckCircle2 size={30} style={{ color: "#bef264" }} />
                  <strong>{selectedFile.name}</strong>
                  <span>{(selectedFile.size / 1024).toFixed(1)} KB · Ready to analyze</span>
                  <small style={{ color: "#bef264", marginTop: "4px" }}>Click to choose a different file</small>
                </div>
              ) : (
                <>
                  <UploadCloud size={28} />
                  <strong>Drop your document here</strong>
                  <span>PDF, DOCX, PNG or JPG · max 25 MB</span>
                </>
              )}
            </div>

            <div style={{ margin: "14px 0" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#8b949e",
                  marginBottom: "6px",
                }}
              >
                Notification Email (for T-72h, T-24h & T-5h Deadline Reminders):
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={isAnalyzing}
                style={{
                  width: "100%",
                  padding: "9px 14px",
                  borderRadius: "8px",
                  background: "#0d131f",
                  border: "1px solid #1f293d",
                  color: "#ffffff",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {uploadError && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid #ef4444",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: "#fca5a5",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                <AlertCircle size={16} />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="modal-footer">
              <span>
                <ShieldCheck size={14} /> Zero persistent file storage
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="secondary-button"
                  onClick={() => setShowUpload(false)}
                  disabled={isAnalyzing}
                >
                  Cancel
                </button>
                <button
                  className="lime-button"
                  onClick={startAnalysis}
                  disabled={!selectedFile || isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} /> Run Intelligence Scan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <DocumentProvider>
      <AppContent />
    </DocumentProvider>
  );
}
