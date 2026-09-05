# `spec.md` — LegalLens: Decision-Ready Document Intelligence Platform

---

## 1. Project Overview & Vision

**LegalLens** transforms static, complex legal contracts (rental agreements, service contracts, NDAs) into an interactive, **decision-ready legal intelligence report**.

Standard AI tools answer *"What does this document say?"*

**LegalLens answers:**

1. *"What does this mean for me financially and operationally?"*
2. *"What could happen under critical scenarios?"*
3. *"Which clauses conflict, override, or trigger penalties across the contract?"*

### Key Non-Functional Constraints

* **Zero Persistent File Storage:** Raw documents (PDFs/DOCX/Images) are processed strictly in an in-memory buffer and never written to disk or blob storage.
* **Vector Persistence & TTL:** Structured clause extractions and vector embeddings reside in **MongoDB Atlas Vector Search** with Time-to-Live (TTL) auto-expiration per session.
* **Proactive Deadlines:** Automated multi-stage email notifications via SMTP.
* **Multimodal Accessibility:** Interactive RAG Copilot with natural voice announcements (TTS).

---

## 2. System Architecture & Topology

The platform adheres to a modern, decoupled production topology:

```text
                           [ USER CLIENT ]
                                  │
                                  ▼
                   ┌──────────────────────────────┐
                   │    FRONTEND (Vercel)         │
                   │    React + Vite + Tailwind   │
                   │    Web Speech Synthesis API  │
                   └──────────────┬───────────────┘
                                  │ HTTPS / REST / SSE
                                  ▼
                   ┌──────────────────────────────┐
                   │    BACKEND (Render)          │
                   │    Node.js / Express API     │
                   │    • In-Memory Parser        │
                   │    • Agenda.js / BullMQ      │
                   │    • Nodemailer (SMTP Engine)│
                   └──────┬───────────────┬───────┘
                          │               │
         Vector Queries & │               │ AI Inferences
         Task Persistence │               │ & Embeddings
                          ▼               ▼
            ┌───────────────────┐   ┌───────────────────────────┐
            │   MONGODB ATLAS   │   │     GOOGLE GEMINI API     │
            │   • Vector Search │   │   • Gemini 3.5 Flash      │
            │   • Task Queue    │   │   • text-embedding-004    │
            │   • TTL Indexes   │   └───────────────────────────┘
            └───────────────────┘

```

| Component | Target Platform | Core Responsibility |
| --- | --- | --- |
| **Frontend** | **Vercel** | Single-Page Application (SPA), Tri-Pane Workspace, Clause DAG visualizer, Web Speech Voice Player. |
| **Backend** | **Render** | In-memory upload ingestion, clause chunking orchestration, LLM RAG pipelines, SMTP task scheduler, token verification. |
| **Database** | **MongoDB Atlas** | Stores session-scoped vector embeddings (`$vectorSearch`), clause dependency metadata, and scheduled task notifications. |
| **LLM / AI Engine** | **Google Gemini** | `gemini-3.5-flash` for extraction, reasoning, scenarios, and synthesis; `text-embedding-004` for vectors. |
| **Mailing Service** | **SMTP Provider** | Automated T-3d, T-1d, and T-5h email dispatches with one-click HMAC action URLs. |

---

## 3. Core Functional Modules & Requirements

### 3.1. In-Memory Ingestion & Privacy Pipeline

* Accepts `.pdf`, `.docx`, `.png`, and `.jpg` via `multipart/form-data`.
* Parsed directly from RAM memory buffer (`multer.memoryStorage()`).
* Extracted into layout-aware blocks (Header, Section, Clause, Sub-clause).
* Memory buffers are explicitly dereferenced and garbage-collected post-embedding.

### 3.2. Structured Extraction & Risk Engine

The ingestion pipeline prompts `gemini-3.5-flash` to output structured JSON mapping:

* **Executive Understanding:** Plain-language summary, complexity rating, fairness index (e.g., *75% Landlord-Biased*).
* **Risk Scorecard:** High/Medium/Low ratings for Financial, Termination, Liability, and Deposit risks with cited evidence.
* **Audited Financial Ledger:** Explicit separation of **Stated Mandatory Commitments** (e.g., Monthly Rent) vs. **Contingent Penalties** (e.g., Early Exit Fee).
* **Clause Relationship DAG:** Multi-hop dependencies (e.g., `Clause 7 [Notice] -> Clause 12 [Termination] -> Clause 21 [Penalty]`).
* **Bilateral Obligation Grid:** Side-by-side breakdown of Tenant/User obligations vs. Counterparty obligations.

### 3.3. Grounded RAG Copilot (`gemini-3.5-flash`)

* Contextual question answering over the document.
* **Retrieval Flow:** User question $\rightarrow$ Vector search over MongoDB Atlas $\rightarrow$ Graph traversal (fetch explicitly linked clauses) $\rightarrow$ Context assembly $\rightarrow$ Streamed response with strict `Clause ID` and `Page` grounding.

### 3.4. Voice Assistant Engine

* Converts chat answers into natural spoken audio via client-side Web Speech Synthesis API.
* **Speech Sanitizer Pipeline:** Strips Markdown hashes (`#`), asterisks (`*`), converts Indian Rupee notation (`₹20,000` $\rightarrow$ *"twenty thousand rupees"*), and formats citations (`[Cl. 12 (p. 5)]` $\rightarrow$ *"according to Clause 12 on page 5"*).
* Real-time sentence boundary events (`onboundary`) to highlight corresponding text dynamically during playback.

### 3.5. Automated Task Extraction & SMTP Scheduler

* Extracts actionable milestones, obligations, and deadlines into ISO timestamps.
* Automatically schedules 3 notification dispatches:
1. **3 Days Before** ($T - 72\text{ hours}$)
2. **1 Day Before** ($T - 24\text{ hours}$)
3. **5 Hours Before** ($T - 5\text{ hours}$)


* Sends responsive HTML emails containing:
* Task subject, deadline timestamp, exact clause source, and financial consequences.
* **One-Click Action Buttons:**
* `[ Mark as Done ]`: Marks task `COMPLETED` and halts remaining scheduled dispatches.
* `[ Remind Me Later ]`: Snoozes notification by a selected duration.
* **No Action / Default:** Status remains `PENDING`; subsequent reminders execute as scheduled.





---

## 4. Database Schema Specifications (MongoDB Atlas)

### Collection: `document_vectors`

Stores chunked clauses, dense vector embeddings, and relationship nodes. Configured with a TTL index to ensure ephemeral privacy.

```json
{
  "_id": "ObjectId('66d98c1a2f1b4c0012a45e01')",
  "sessionId": "sess_98a72b_user_om",
  "clauseId": "CLAUSE_12",
  "title": "Termination and Notice Period",
  "clauseText": "Either party may terminate this agreement by providing a 60-day written notice...",
  "pageNumber": 5,
  "embedding": [0.0124, -0.0451, 0.0892, 0.0031, "... 768 dims ..."],
  "metadata": {
    "category": "Termination",
    "riskLevel": "HIGH",
    "financials": {
      "isExplicit": true,
      "statedAmount": null,
      "contingentPenalty": "₹20,000"
    },
    "obligations": {
      "assignedTo": "Tenant",
      "action": "Submit written notice 60 days in advance"
    },
    "connectedClauses": ["CLAUSE_7", "CLAUSE_18", "CLAUSE_21"]
  },
  "createdAt": "2026-09-05T05:45:00.000Z"
}

```

* **Indexes:**
* Vector Index: `legal_vector_index` (Cosine similarity, 768 dimensions).
* TTL Index: `{ "createdAt": 1 }` with `expireAfterSeconds: 86400` (auto-purged after 24 hours).
* Compound Index: `{ "sessionId": 1, "clauseId": 1 }`.



### Collection: `task_reminders`

Stores scheduled tasks, trigger schedules, and tokenized actions.

```json
{
  "_id": "ObjectId('66d99f4c3a2e5d0013b78f02')",
  "sessionId": "sess_98a72b_user_om",
  "recipientEmail": "user@example.com",
  "documentName": "Residential Rental Agreement",
  "task": {
    "title": "Serve 60-Day Termination Notice",
    "clauseRef": "Clause 12 (Page 5)",
    "description": "Deadline to submit written notice if not renewing lease.",
    "deadline": "2027-01-30T18:30:00.000Z",
    "financialImpact": "Forfeiture of 1-month deposit (₹20,000)"
  },
  "schedule": [
    { "type": "3_DAYS_BEFORE", "runAt": "2027-01-27T18:30:00.000Z", "sent": false },
    { "type": "1_DAY_BEFORE",  "runAt": "2027-01-29T18:30:00.000Z", "sent": false },
    { "type": "5_HOURS_BEFORE","runAt": "2027-01-30T13:30:00.000Z", "sent": false }
  ],
  "status": "PENDING",
  "snoozedUntil": null,
  "actionTokens": {
    "doneToken": "e4d2b7a956214f17...",
    "snoozeToken": "a8f9c1b349281a02..."
  },
  "createdAt": "2026-09-05T05:45:00.000Z",
  "updatedAt": "2026-09-05T05:45:00.000Z"
}

```

---

## 5. API Interface Definitions

### 5.1. Ingestion & Analysis

* **`POST /api/documents/analyze`**
* **Input:** `multipart/form-data` with `file` (Buffer) and `recipientEmail`.
* **Process:** Parses memory buffer, extracts structured intelligence report, inserts vector embeddings into MongoDB Atlas, schedules SMTP deadline jobs.
* **Response:**
```json
{
  "success": true,
  "sessionId": "sess_98a72b_user_om",
  "executiveReport": { ... },
  "financialLedger": [ ... ],
  "clauseGraph": { "nodes": [ ... ], "edges": [ ... ] },
  "tasksDetected": 3
}

```





### 5.2. Grounded RAG Chat

* **`POST /api/chat/query`**
* **Body:** `{ "sessionId": "sess_...", "question": "Can deposit be withheld for repainting?" }`
* **Process:** Vector search + Clause DAG contextual expansion $\rightarrow$ Gemini 3.5 Flash RAG inference.
* **Response:**
```json
{
  "answer": "Under Clause 18, security deposits can only be deducted for structural damages...",
  "citations": [
    { "clauseId": "CLAUSE_18", "page": 7, "snippet": "Deductions permitted solely for..." }
  ],
  "connectedClauses": ["CLAUSE_21"]
}

```





### 5.3. Task Webhooks & SMTP Handlers

* **`GET /api/tasks/action?token=<doneToken>&action=done`**
* Sets task status to `COMPLETED`; cancels remaining pending jobs.
* Returns user confirmation page.


* **`GET /api/tasks/action?token=<snoozeToken>&action=snooze&hours=24`**
* Snoozes the task and updates trigger schedule.



---

## 6. Project Repository Organization

A monorepo structure adhering to Vercel (Frontend) and Render (Backend) deployment requirements:

```text
legallens/
├── .gitignore
├── README.md
├── spec.md
│
├── frontend/                     # Deployed to Vercel
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── dashboard/       # PostureGauge, RiskTable, FinancialLedger
│   │   │   ├── graph/           # Interactive Clause DAG (React Flow)
│   │   │   ├── chat/            # RAG Copilot, VoicePlayer, TTS Sanitizer
│   │   │   └── timeline/        # Legal Timeline & Obligation Grid
│   │   ├── hooks/
│   │   │   └── useVoiceAssistant.js
│   │   ├── services/
│   │   │   └── api.js           # Axios client configured with VITE_API_URL
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
└── backend/                      # Deployed to Render
    ├── src/
    │   ├── config/
    │   │   ├── db.js            # MongoDB Atlas connection & vector index init
    │   │   └── mailer.js        # Nodemailer SMTP transporter
    │   ├── controllers/
    │   │   ├── analyzeController.js
    │   │   ├── chatController.js
    │   │   └── taskController.js
    │   ├── middleware/
    │   │   └── uploadMemory.js  # Multer in-memory storage config
    │   ├── models/
    │   │   ├── VectorClause.js
    │   │   └── TaskReminder.js
    │   ├── routes/
    │   │   ├── documentRoutes.js
    │   │   ├── chatRoutes.js
    │   │   └── taskRoutes.js
    │   ├── services/
    │   │   ├── geminiService.js # Gemini 3.5 Flash & text-embedding-004
    │   │   ├── schedulerService.js # Agenda.js / BullMQ job definitions
    │   │   └── vectorService.js # MongoDB $vectorSearch aggregation
    │   └── server.js            # Express app entrypoint
    ├── package.json
    ├── .env.example
    └── render.yaml              # Optional Render infrastructure-as-code

```

---

## 7. Step-by-Step Production Deployment Guide

### Phase 1: Database Setup (MongoDB Atlas)

1. **Cluster Creation:** Create an M0/M10 cluster on MongoDB Atlas.
2. **Network Access:** Allow backend IP (or `0.0.0.0/0` during configuration).
3. **Atlas Vector Search Index:**
* Navigate to: **Atlas Database $\rightarrow$ Search $\rightarrow$ Create Search Index $\rightarrow$ JSON Editor**.
* Select database: `legallens`, collection: `document_vectors`.
* Name the index: `legal_vector_index`.
* Configuration:
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




4. **TTL Index Creation:** Run in Mongo Shell:
```javascript
db.document_vectors.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 86400 });

```



---

### Phase 2: Backend Deployment (Render)

1. Push the code to GitHub.
2. Log into Render $\rightarrow$ **New Web Service** $\rightarrow$ Connect Repository.
3. Configure settings:
* **Name:** `legallens-backend`
* **Root Directory:** `backend`
* **Environment:** `Node`
* **Build Command:** `npm install`
* **Start Command:** `npm start`


4. Add **Environment Variables** in Render:
| Key | Value Description |
| --- | --- |
| `PORT` | `5000` (Render binds automatically, code must use `process.env.PORT`) |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster.mongodb.net/legallens` |
| `GEMINI_API_KEY` | Google AI Studio API Key for Gemini 3.5 Flash |
| `SMTP_HOST` | `smtp.gmail.com` (or SendGrid/Postmark/Resend) |
| `SMTP_PORT` | `465` (SSL) or `587` (TLS) |
| `SMTP_USER` | Notification sender email address |
| `SMTP_PASS` | SMTP App Password / API secret |
| `FRONTEND_URL` | `[https://legallens.vercel.app](https://legallens.vercel.app)` (for CORS whitelist) |
| `JWT_SECRET` | 64-character random string for HMAC action tokens |


5. Deploy and verify the live URL (e.g., `[https://legallens-backend.onrender.com/health](https://legallens-backend.onrender.com/health)`).

---

### Phase 3: Frontend Deployment (Vercel)

1. Log into Vercel $\rightarrow$ **Add New Project** $\rightarrow$ Import GitHub Repository.
2. Configure settings:
* **Framework Preset:** `Vite`
* **Root Directory:** `frontend`
* **Build Command:** `npm run build`
* **Output Directory:** `dist`


3. Add **Environment Variables** in Vercel:
| Key | Value |
| --- | --- |
| `VITE_API_URL` | `[https://legallens-backend.onrender.com](https://legallens-backend.onrender.com)` |


4. Click **Deploy**.
5. Once live, copy the assigned domain (e.g., `[https://legallens.vercel.app](https://legallens.vercel.app)`) and update the `FRONTEND_URL` variable in your Render backend settings to lock down CORS.

---

## 8. Verification & QA Acceptance Checklist

* [ ] **Zero-Disk Check:** Verify that uploading a multi-page PDF generates no temp files on Render storage.
* [ ] **Vector Lifecycle:** Confirm clause chunks are created in `document_vectors` with valid embeddings and that the TTL index drops expired sessions.
* [ ] **Graph Integrity:** Verify that linked clauses (`connectedClauses`) are clickable in the UI DAG and open the corresponding text view.
* [ ] **RAG Grounding:** Ask the Copilot a specific scenario (e.g., *"What if I break lease at 6 months?"*) and verify that every statement cites a clause ID and page number.
* [ ] **Voice Synthesis:** Verify that the audio player strips markdown symbols, formats rupee amounts into words, and plays without reading raw markdown syntax.
* [ ] **Email Dispatch:** Trigger a document parse with a known deadline, verify that jobs are registered in MongoDB, and confirm that test emails trigger correctly with working "Mark as Done" action links.