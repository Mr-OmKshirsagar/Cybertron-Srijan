# `design.md` — LegalLens System & Technical Design Document

---

## 1. System Architecture Design

### 1.1 End-to-End Component Topology

LegalLens is architected as a decoupled, stateless service ecosystem leveraging Google Gemini for reasoning and embeddings, MongoDB Atlas for ephemeral vector search, and Nodemailer/Agenda for deadline dispatches.

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT WORKSPACE (Vercel)                         │
│                                                                                  │
│   ┌───────────────────────┐  ┌───────────────────────┐  ┌────────────────────┐   │
│   │   Tri-Pane Desktop    │  │  Interactive React    │  │   Voice Synthesizer│   │
│   │   Document Workspace  │  │  Flow Clause DAG      │  │   (Web Speech API) │   │
│   └───────────┬───────────┘  └───────────┬───────────┘  └─────────▲──────────┘   │
└───────────────┼──────────────────────────┼────────────────────────┼──────────────┘
                │ HTTPS (REST API)         │ SSE / JSON Stream      │ Spoken Text
                ▼                          ▼                        │
┌───────────────────────────────────────────────────────────────────┴──────────────┐
│                                BACKEND SERVICES (Render)                         │
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                         Express API Gateway                              │   │
│   │            (CORS, Helmet, Rate Limiter, In-Memory Multer)                │   │
│   └───────┬──────────────────────────┬─────────────────────────────┬─────────┘   │
│           │                          │                             │             │
│           ▼                          ▼                             ▼             │
│   ┌───────────────┐          ┌───────────────┐             ┌───────────────┐     │
│   │ Extraction &  │          │ Graph RAG     │             │ Deadline      │     │
│   │ Parser Engine │          │ Copilot Engine│             │ Scheduler     │     │
│   │ (Buffer OCR)  │          │ (Gemini 3.5)  │             │ (Agenda.js)   │     │
│   └───────┬───────┘          └───────┬───────┘             └───────┬───────┘     │
└───────────┼──────────────────────────┼─────────────────────────────┼─────────────┘
            │ Embeddings               │ Vector Queries              │ Jobs / Triggers
            ▼                          ▼                             ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             DATA & EXTERNAL PLATFORMS                            │
│                                                                                  │
│   ┌─────────────────────────────────────────┐  ┌─────────────────────────────┐   │
│   │           MongoDB Atlas                 │  │       Google Gemini API     │   │
│   │ • Vector Search Index (text-embed-004)  │  │ • Gemini 3.5 Flash          │   │
│   │ • 24-hr TTL Session Collections         │  │ • text-embedding-004        │   │
│   │ • Agenda Job Registry                   │  └─────────────────────────────┘   │
│   └─────────────────────────────────────────┘  ┌─────────────────────────────┐   │
│                                                │       SMTP Relay Server     │   │
│                                                │ • Nodemailer Dispatch Engine│   │
│                                                └─────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘

```

---

## 2. In-Memory Privacy & Ingestion Pipeline

To strictly eliminate on-disk data leaks and ensure zero file persistence, uploads are streamed into heap memory and released immediately following chunk processing and embedding generation.

```text
[Incoming POST /api/documents/analyze]
                   │
                   ▼
┌───────────────────────────────────────────────────────────────┐
│ Memory Storage Filter (`multer.memoryStorage()`)              │
│ • Max file size constraint: 25 MB                             │
│ • MIME validation: application/pdf, image/png, image/jpeg     │
│ • File buffer allocated strictly in V8 Buffer Pool            │
└──────────────────────────────┬────────────────────────────────┘
                               │ `req.file.buffer`
                               ▼
┌───────────────────────────────────────────────────────────────┐
│ Layout-Aware Structural Chunker (`pdf-parse` / PDFStream)     │
│ • Extracts document sections, titles, and sub-clauses         │
│ • Assigns deterministic IDs (`CLAUSE_1`, `CLAUSE_2`)           │
│ • Retains page-boundary coordinates for client-side anchoring │
└──────────────────────────────┬────────────────────────────────┘
                               │ Extracted Chunks
                               ▼
┌───────────────────────────────────────────────────────────────┐
│ Batch Vectorizer (`text-embedding-004`)                      │
│ • Embeds clause contents into 768-dimensional float arrays    │
│ • Appends metadata (risk, parties, contingent amounts)        │
└──────────────────────────────┬────────────────────────────────┘
                               │ Writes Vectors & Graph Metadata
                               ▼
┌───────────────────────────────────────────────────────────────┐
│ MongoDB Atlas Persistence (`document_vectors`)                │
│ • Session-scoped write with 24-hour TTL indexing              │
└──────────────────────────────┬────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│ Explicit Heap Dereferencing & Garbage Collection Hook         │
│ • `req.file.buffer = null;`                                   │
│ • Original binary completely wiped from Node.js runtime heap  │
└───────────────────────────────────────────────────────────────┘

```

---

## 3. Data Schema & Indexing Specifications

### 3.1 `document_vectors` Collection

Maintains the parsed clause nodes, embeddings, and relationship edges for a specific document session.

```typescript
interface IDocumentVector {
  _id: Object;
  sessionId: string;             // Client session identifier
  documentType: string;          // e.g., "Residential Rental Agreement"
  clauseId: string;              // e.g., "CLAUSE_12"
  title: string;                 // Section/Clause title
  clauseText: string;            // Exact verbatim text
  pageNumber: number;            // Page index for UI grounding
  embedding: number[];           // 768-dimensional dense vector
  metadata: {
    category: string;            // "Termination" | "Deposit" | "Liability" | "Rent"
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    financials: {
      isExplicit: boolean;
      statedAmount: string | null;      // e.g., "₹20,000"
      contingentPenalty: string | null; // e.g., "1 Month Rent"
    };
    obligations: {
      assignedTo: "User" | "Counterparty" | "Mutual";
      action: string;
    };
    connectedClauses: string[];  // Array of linked clauseIds (e.g., ["CLAUSE_7", "CLAUSE_21"])
  };
  createdAt: Date;               // Subject to 24-hour TTL index
}

```

#### MongoDB Atlas Index Configurations

* **Vector Index (`legal_vector_index`):**
```json
{
  "fields": [
    {
      "numDimensions": 768,
      "path": "embedding",
      "similarity": "cosine",
      "type": "vector"
    },
    {
      "path": "sessionId",
      "type": "filter"
    }
  ]
}

```


* **TTL Auto-Purge Index:**
```javascript
db.document_vectors.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 86400 });

```



---

### 3.2 `task_reminders` Collection

Tracks time-sensitive contractual events, scheduled email jobs, and interactive response states.

```typescript
interface ITaskReminder {
  _id: Object;
  sessionId: string;
  recipientEmail: string;
  documentName: string;
  task: {
    title: string;
    clauseRef: string;           // e.g., "Clause 12 (Page 5)"
    description: string;
    deadline: Date;              // Contractual due date
    financialImpact: string;     // Monetary penalty if breached
  };
  schedule: Array<{
    type: "3_DAYS_BEFORE" | "1_DAY_BEFORE" | "5_HOURS_BEFORE";
    runAt: Date;
    sent: boolean;
    jobId?: string;
  }>;
  status: "PENDING" | "COMPLETED" | "SNOOZED" | "EXPIRED";
  snoozedUntil: Date | null;
  actionTokens: {
    doneToken: string;           // HMAC-SHA256 signature
    snoozeToken: string;         // HMAC-SHA256 signature
  };
  createdAt: Date;
  updatedAt: Date;
}

```

---

## 4. Graph-Augmented RAG Retrieval Flow

Retrieval combines Approximate Nearest Neighbor (ANN) vector search with deterministic graph traversal to resolve multi-hop contractual dependencies before sending the prompt to Gemini 3.5 Flash.

```text
[User Prompt: "What happens if I terminate after 6 months?"]
                           │
                           ▼
          [Generate Vector: text-embedding-004]
                           │
                           ▼
          [MongoDB $vectorSearch (Top-K = 4)]
                           │
                           ▼ Matches: Clause 12 (Early Termination)
    ┌─────────────────────────────────────────────────────────────┐
    │ Graph Traversal Expansion (1-Hop Adjacency Scan)           │
    │ Inspects `metadata.connectedClauses` on retrieved nodes:    │
    │ • Reads: Clause 7 (Notice Requirement)                      │
    │ • Reads: Clause 18 (Security Deposit Forfeiture)            │
    │ • Reads: Clause 21 (Contractual Liquidated Damages)         │
    └──────────────────────────────┬──────────────────────────────┘
                                   │
                                   ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ Context Assembly & Prompt Grounding                         │
    │ • Combines Primary Matches + Traversed Adjacency Nodes      │
    │ • Injects Statutory Guardrails (e.g., Local Tenancy Acts)   │
    └──────────────────────────────┬──────────────────────────────┘
                                   │
                                   ▼
          [Gemini 3.5 Flash Streaming Execution]
                                   │
                                   ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ Structured SSE Output Stream                                │
    │ 1. Plain-English interpretation                             │
    │ 2. Exact clause citations (`clauseId`, `pageNumber`)        │
    │ 3. Traversal Path (`7 -> 12 -> 18 -> 21`)                   │
    └─────────────────────────────────────────────────────────────┘

```

---

## 5. UI/UX Tri-Pane Desktop Workspace

The desktop interface layout optimizes decision velocity and context grounding across three coordinated panels.

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ LegalLens Workspace  │  Doc: Residential_Agreement_2026.pdf  │ Posture: 78% Landlord Bias (High Risk)  │
├───────────────────────────────┬─────────────────────────────────────────┬───────────────────────────────┤
│ PANE 1: GROUNDING DOCUMENT    │ PANE 2: DECISION DASHBOARD              │ PANE 3: RAG COPILOT & VOICE   │
│                               │                                         │                               │
│ [Page 5 / 12]                 │ 🎯 Executive Posture                    │ 💬 Ask Document Questions     │
│                               │ • Fairness Index: 22/100 (Unfavorable)  │                               │
│ ...                           │ • Total Clauses Analyzed: 27            │ [ "What if I leave early?" ]  │
│ 12. TERMINATION:              │                                         │                               │
│ ┌───────────────────────────┐ │ 💰 Financial Risk Exposure              │ 🤖 Gemini 3.5 Flash Copilot:  │
│ │ Either party may          │ │ • Fixed Rent: ₹2,40,000 (Stated)        │ Terminating at 6 months       │
│ │ terminate by providing    │ │ • Deposit Escrow: ₹40,000 (Stated)      │ requires 60-day notice and    │
│ │ 60 days notice in writing.│ │ • Potential Penalty: ₹20,000 (Estimate) │ forfeits 1 month deposit.     │
│ │ Failure to do so incurs   │ │                                         │                               │
│ │ forfeiture of deposit...  │ │ 🧩 Clause Relationship DAG              │ Sources: [Cl. 12] [Cl. 18]    │
│ └───────────────────────────┘ │   [Cl. 7] ──► [Cl. 12]                  │                               │
│ (Active Selection Highlight)  │                 │                       │ 🔊 [▶ Play Audio] [1.0x]      │
│                               │         ┌───────┴───────┐               │ ── Sentence Sync Highlight ── │
│ ...                           │         ▼               ▼               │                               │
│ 18. SECURITY DEPOSIT:         │      [Cl. 18]        [Cl. 21]           │ [ Type contractual query... ] │
│ Deductions authorized for...  │                                         │                               │
│                               │ 📅 Milestone Timeline & Deadlines       │                               │
│                               │ • 30 Jan: 60-Day Notice (Critical)      │                               │
└───────────────────────────────┴─────────────────────────────────────────┴───────────────────────────────┘

```

### Tri-Pane Synchronization Mechanism

1. **Clause Hover:** Hovering over a node in the **Clause DAG (Pane 2)** highlights the connected node path and scrolls **Pane 1** directly to the matched PDF page and clause coordinate.
2. **Citation Click:** Clicking a source pill (`[Cl. 12 (p. 5)]`) in the **Copilot (Pane 3)** opens the clause focus modal and re-centers the visual DAG on Clause 12.

---

## 6. Voice Assistant Engine & Speech Sanitizer

The voice subsystem converts technical responses into natural, conversational speech using browser-native speech synthesis, bypassing markdown parsing artifacts.

```text
[Raw Gemini Response]
"Under **Clause 18 (Page 7)**, deposit deductions cannot exceed ₹20,000 without itemized receipts."
                                       │
                                       ▼
                     [Pre-TTS Speech Sanitization Pipeline]
                                       │
  ├── 1. Regex Markdown Stripper: Deletes `**`, `###`, `_`, table borders
  ├── 2. Citation Phonetics: `\[Cl\.\s*(\d+)\]` ➔ "according to Clause $1"
  ├── 3. Currency Normalizer: `₹(\d+)` ➔ "$1 rupees"
  └── 4. Legal Abbreviation Expander: "i.e." ➔ "that is", "w.r.t." ➔ "with respect to"
                                       │
                                       ▼
[Clean Phonetic String]
"Under according to Clause 18 on Page 7, deposit deductions cannot exceed twenty thousand rupees without itemized receipts."
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Web Speech Synthesis API Controller                                  │
│ • Instantiates `SpeechSynthesisUtterance`                            │
│ • Binds preferred voice profile (`en-IN` / `hi-IN`)                  │
│ • Binds `onboundary` callback: Emits current character/word index    │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ Emits Word Boundaries
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Real-Time UI Karaoke Highlighter                                     │
│ • Matches word offset to DOM span in chat message container          │
│ • Adds `.bg-amber-200` background highlight in real-time as spoken   │
└──────────────────────────────────────────────────────────────────────┘

```

---

## 7. Automated SMTP Notification & Action Engine

Task dispatches follow an automated lifecycle managed by Agenda.js and Nodemailer, using secure HMAC tokens for frictionless email-based state management.

```text
[Document Analyzed]
         │
         ▼
[Milestone Deadlines Extracted (T)]
         │
         ├── Calculates: T - 72h (3 Days Prior)
         ├── Calculates: T - 24h (1 Day Prior)
         └── Calculates: T - 5h  (5 Hours Prior)
         │
         ▼
[Agenda.js Job Persistence in MongoDB]
         │
         ▼
[Execution Time Arrives] ──► [Nodemailer SMTP Dispatch]
                                      │
                                      ▼
                        [User Receives HTML Email]
                        ┌──────────────────────────────────────────────┐
                        │ LegalLens: Action Required in 3 Days         │
                        │ Task: Submit 60-Day Written Notice           │
                        │ Impact: Risk of ₹20,000 penalty              │
                        │                                              │
                        │ [ Mark Already Done ]  [ Remind in 24 Hrs ]  │
                        └───────────────────────┬──────────────────────┘
                                                │
                          ┌─────────────────────┴──────────────────────┐
                          │ User Clicks Action Link                    │
                          ▼                                            ▼
               [GET /api/tasks/action?token=...]            [GET /api/tasks/action?snooze=...]
                          │                                            │
                          ▼                                            ▼
               [Verify HMAC Token]                          [Verify HMAC Token]
                          │                                            │
                          ▼                                            ▼
               • Status: COMPLETED                          • Status: SNOOZED
               • Cancel remaining jobs in Agenda            • Reschedule agenda runAt
               • Render "Task Resolved" View                • Render "Snoozed" View

```

### Security & Token Generation

Action URLs embed cryptographic signatures to prevent unauthorized state updates:

```text
Action URL = BASE_URL + "/api/tasks/action"
             + "?taskId=" + taskId
             + "&action=" + ("done" | "snooze")
             + "&token="  + HMAC_SHA256(taskId + action + expiration, JWT_SECRET)

```

---

## 8. REST & Streaming API Interface Specifications

### 8.1 Document Ingestion & Extraction

* **Endpoint:** `POST /api/documents/analyze`
* **Content-Type:** `multipart/form-data`
* **Request Payload:**
* `file`: Binary Buffer (PDF/Image, max 25MB)
* `recipientEmail`: string (Valid RFC 5322 email)


* **Response Payload (200 OK):**
```json
{
  "success": true,
  "sessionId": "sess_89f0a2e1",
  "summary": {
    "documentType": "Residential Rental Agreement",
    "fairnessScore": 42,
    "bias": "Counterparty-Favored",
    "clauseCount": 27
  },
  "riskDashboard": [
    { "category": "Termination", "level": "HIGH", "clauseRef": "CLAUSE_12", "excerpt": "60 days written notice required." }
  ],
  "financialLedger": {
    "fixedCommitments": [{ "item": "Monthly Rent", "amount": "₹20,000", "clauseRef": "CLAUSE_3" }],
    "contingentLiabilities": [{ "item": "Late Penalty", "amount": "₹20,000", "clauseRef": "CLAUSE_21" }]
  },
  "dag": {
    "nodes": [{ "id": "CLAUSE_12", "label": "Termination", "risk": "HIGH" }],
    "edges": [{ "source": "CLAUSE_7", "target": "CLAUSE_12", "relation": "CONDITIONS" }]
  }
}

```



---

### 8.2 Grounded Graph Copilot Query

* **Endpoint:** `POST /api/chat/query`
* **Content-Type:** `application/json`
* **Request Payload:**
```json
{
  "sessionId": "sess_89f0a2e1",
  "question": "Can the owner keep my deposit if the walls have nail holes?"
}

```


* **Response Stream (`text/event-stream`):**
```text
event: chunk
data: {"text": "According to "}

event: chunk
data: {"text": "Clause 18 (Page 7), deductions are limited to structural damage."}

event: metadata
data: {"citations": [{"clauseId": "CLAUSE_18", "page": 7}], "graphPath": ["CLAUSE_18", "CLAUSE_21"]}

event: end
data: [DONE]

```



---

### 8.3 Task Resolution Webhook

* **Endpoint:** `GET /api/tasks/action`
* **Query Parameters:**
* `taskId`: string
* `action`: `"done"` | `"snooze"`
* `hours`: number (optional, default: 24)
* `token`: string (HMAC signature)


* **Response:** Returns an HTML confirmation page displaying updated task state.

---

## 9. Monorepo Directory Layout

```text
legallens/
├── .gitignore
├── README.md
├── spec.md
├── design.md
│
├── frontend/                          # Vercel Deployment Target
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── assets/
│       ├── components/
│       │   ├── layout/
│       │   │   ├── TriPaneContainer.jsx
│       │   │   └── TopNavigation.jsx
│       │   ├── viewer/
│       │   │   ├── DocumentViewer.jsx
│       │   │   └── TextHighlightLayer.jsx
│       │   ├── dashboard/
│       │   │   ├── PostureGauge.jsx
│       │   │   ├── RiskMatrix.jsx
│       │   │   ├── FinancialLedger.jsx
│       │   │   └── ClauseDAGFlow.jsx      # React Flow DAG Component
│       │   ├── copilot/
│       │   │   ├── ChatDrawer.jsx
│       │   │   ├── MessageList.jsx
│       │   │   ├── CitationPill.jsx
│       │   │   └── VoiceControls.jsx      # Audio playback & velocity toggle
│       │   └── timeline/
│       │       ├── LegalTimeline.jsx
│       │       └── TaskCard.jsx
│       ├── hooks/
│       │   ├── useDocumentSession.js
│       │   ├── useClauseGraph.js
│       │   ├── useSpeechSynthesis.js      # Pre-TTS Sanitizer + Web Speech API
│       │   └── useCopilotStream.js
│       ├── services/
│       │   └── api.js                     # Configured Axios instance (VITE_API_URL)
│       └── utils/
│           ├── speechSanitizer.js         # Regex markdown & currency cleaner
│           └── graphLayoutHelper.js       # Dagre layout coordinates calculator
│
└── backend/                           # Render Deployment Target
    ├── package.json
    ├── server.js                      # Express App initialization & port binding
    ├── .env.example
    └── src/
        ├── config/
        │   ├── db.js                  # MongoDB Atlas connection + index validation
        │   ├── mailer.js              # Nodemailer transport instance
        │   └── agenda.js              # Agenda scheduler initialization
        ├── controllers/
        │   ├── analyzeController.js   # Buffer ingestion & Gemini extraction
        │   ├── chatController.js      # Vector search + Graph RAG pipeline
        │   └── taskController.js      # HMAC validation & task status handlers
        ├── middleware/
        │   ├── uploadMemory.js        # Multer in-memory storage buffer
        │   ├── rateLimiter.js         # Express rate limit per session/IP
        │   └── errorHandler.js        # Global error interception
        ├── models/
        │   ├── VectorClause.js        # Mongoose Schema for document_vectors
        │   └── TaskReminder.js        # Mongoose Schema for task_reminders
        ├── routes/
        │   ├── documentRoutes.js      # /api/documents/*
        │   ├── chatRoutes.js          # /api/chat/*
        │   └── taskRoutes.js          # /api/tasks/*
        ├── services/
        │   ├── geminiService.js       # Gemini 3.5 Flash & text-embedding-004 calls
        │   ├── vectorService.js       # MongoDB $vectorSearch aggregations
        │   ├── graphService.js        # Clause DAG traversal & adjacency lookups
        │   └── notificationService.js # Nodemailer email generators & templates
        └── utils/
            ├── tokenGenerator.js      # HMAC token generation & verification
            └── ocrCleaner.js          # Raw string sanitization & structural chunking

```

---

## 10. Implementation Sequence & Milestones

```text
PHASE 1: Core Ingestion & Extraction Engine (Days 1–3)
├── In-memory Multer pipeline setup (zero-disk persistence verified)
├── Gemini 3.5 Flash JSON schema extraction prompt engineering
├── MongoDB Atlas connection with 24-hr TTL index configuration
└── Vector generation integration with text-embedding-004

PHASE 2: Graph Construction & Copilot Engine (Days 4–6)
├── Clause adjacency mapping & Directed Acyclic Graph (DAG) construction
├── MongoDB $vectorSearch aggregation pipeline implementation
├── Graph-augmented RAG context resolution (hybrid vector + graph hops)
└── SSE streaming endpoint setup for real-time inference delivery

PHASE 3: Frontend Tri-Pane Workspace & Visualization (Days 7–9)
├── Tri-Pane responsive grid layout (Tailwind CSS)
├── React Flow integration for the Clause Dependency DAG
├── Document viewer with synchronized anchor-jumping on citation clicks
└── Voice Assistant integration (Speech Sanitizer + Web Speech API)

PHASE 4: Automation, Scheduling & Deployment (Days 10–12)
├── Agenda.js scheduler integration with MongoDB persistence
├── Nodemailer SMTP template creation & HMAC action token handlers
├── Cross-Origin Resource Sharing (CORS) lock and production security checks
└── Production deployment: Frontend (Vercel) & Backend (Render)

```