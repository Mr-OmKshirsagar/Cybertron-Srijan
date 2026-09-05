# `test.md` — LegalLens Feature Testing & QA Verification Guide

This document provides a step-by-step guide to verify that all features across the LegalLens backend, MongoDB Atlas vector database, Google Gemini AI reasoning engine, and frontend workspace are functioning correctly.

---

## 1. Quick Start: Starting the Services

### 1.1 Start the Backend (Port 5000)
Open a terminal in the repository root:
```bash
cd backend
npm run dev
```
**Expected Terminal Output:**
```text
🚀 [LegalLens] Starting backend services...
✅ [DB] MongoDB connected: ac-4pgqqbb-shard-00-00.kmxhwzs.mongodb.net/legallens
✅ [DB] TTL index on 'document_vectors' confirmed (24h auto-expiry).
✅ [Agenda] Background deadline scheduler started.
✨ [LegalLens] Server running on http://localhost:5000
📡 [LegalLens] Health check: http://localhost:5000/api/health
```

> [!TIP]
> **Troubleshooting `EADDRINUSE: port 5000 already in use`:**
> If port 5000 is occupied by a previous process on Windows, run this in PowerShell to release it:
> ```powershell
> Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force
> ```

---

### 1.2 Start the Frontend (Port 3000)
In a separate terminal:
```bash
cd frontend
npm run dev
```
Open your browser at **[http://localhost:3000](http://localhost:3000)**.

---

## 2. Automated Test Suites (Instant 1-Command Tests)

Run these automated scripts to verify all backend API endpoints and data flows in under 10 seconds:

### Test 1: Full Backend API Verification Suite
```bash
cd backend
npm test
```
**What it tests:**
* `GET /api/health`: Confirms server health and MongoDB connection status.
* `GET /api/tasks`: Verifies task retrieval.
* `POST /api/chat/query`: Tests hybrid vector + graph RAG query with Gemini inference.
* `GET /api/tasks/action`: Validates HMAC cryptographic security on action tokens.

---

### Test 2: In-Memory Document Ingestion & Extraction Test
```bash
cd backend
node test-analyze.js
```
**What it tests:**
* Multipart upload of contract text buffer in RAM.
* Verifies zero-disk processing (no temporary files created).
* Verifies Gemini structured extraction (fairness score, risk scorecard, financial ledger, bilateral obligations, DAG, and tasks).

---

### Test 3: Session Vector Search & Graph Traversal Test
```bash
cd backend
node test-session-rag.js
```
**What it tests:**
* Query embedding generation (`text-embedding-004`).
* Ephemeral session vector search over chunked clauses.
* 1-hop adjacency traversal (`connectedClauses` graph hops).
* Strict citation grounding (`[Cl. X (p. Y)]`).

---

### Test 4: Frontend TypeScript & Production Build Verification
```bash
cd frontend
npm run check
npm run build
```
**Expected Output:** `tsc --noEmit` exits with 0 errors, and Vite builds client assets into `dist/public` without warnings.

---

## 3. Manual Feature-by-Feature Testing Checklist

### Feature 1: Health & Database Connectivity
1. In your browser or terminal, visit:
   ```text
   http://localhost:5000/api/health
   ```
2. **Pass Criteria:**
   ```json
   {
     "status": "healthy",
     "service": "LegalLens Intelligence API",
     "databaseConnected": true
   }
   ```

---

### Feature 2: In-Memory Document Analysis (Zero-Disk Privacy)
1. In the frontend at `http://localhost:3000`, click **"Analyze a document"** in the sidebar (or top right **"+ Analyze document"**, or press `⌘ U`).
2. The upload modal will appear with the dropzone.
3. Select or drag-and-drop any contract file (`.pdf`, `.docx`, `.png`, `.jpg`, or `.txt`).
4. Enter an email address for deadline notifications (default: `om.mehta@example.com`).
5. Click **"Run Intelligence Scan"**.
6. **Watch the live progress stages:**
   - *Stage 1:* "Allocating RAM buffer (Zero-Disk privacy)..."
   - *Stage 2:* "Gemini 3.5 Flash extracting structured clauses & risk..."
   - *Stage 3:* "Generating 768-dim vectors & building dependency DAG..."
   - *Stage 4:* "Scheduling proactive deadline reminders..."
7. **Pass Criteria:**
   - The modal automatically closes.
   - The workspace updates with your document's name, fairness score, and risk scorecard.
   - The top banner shows `"Session-scoped (24h TTL)"` confirming zero persistent file storage.

---

### Feature 3: Grounded Copilot & Voice Synthesizer
1. In the **Overview** page, scroll down to **"07 · Grounded copilot"**.
2. Click one of the quick question chips (e.g. *"Can deposit be withheld for repainting or nail holes?"*) or type a custom question.
3. Click the **Send** button (or press `Enter`).
4. **Pass Criteria (Answer Grounding):**
   - Displays a grounded response citing exact clause IDs and page numbers (e.g. `[CLAUSE 12 · P. 5]`).
   - Cites the cross-clause relationship chain (e.g. notice requirement $\rightarrow$ exit penalty).
   - Provides a bottom-line operational recommendation.
5. Click **"Hear answer"**:
   - The client-side Web Speech Synthesis starts speaking.
   - **Phonetic Verification:**
     - Asterisks, markdown headings, and hashes are stripped.
     - Currency notation (`₹20,000`) is spoken phonetically as *"twenty thousand rupees"*.
     - Citations (`[Cl. 12 (p. 5)]`) are spoken naturally as *"according to Clause 12 on page 5"*.
   - Click **"Stop audio"** to ensure playback stops cleanly.

---

### Feature 4: Clause Intelligence Browser
1. Click **"Clause intelligence"** in the sidebar navigation (`/clause-intelligence`).
2. **Test Search:**
   - Type `"termination"` or `"deposit"` in the search bar.
   - Notice matching clauses filter instantly.
3. **Test Filter Pills:**
   - Click `"High"`, `"Medium"`, `"Financial"`, or `"Termination"` pills.
   - The list filters by risk level and category.
4. **Test Clause Inspector:**
   - Click on any clause row (e.g., `CLAUSE 12`).
   - The right inspector displays:
     - Exposure score gauge (e.g., `82/100`).
     - Plain-language operational read.
     - Connected clauses list.
   - Click a connected clause pill (e.g., `CLAUSE 21`) inside the inspector:
     - The selection jumps directly to that clause!

---

### Feature 5: Clause Relationship DAG
1. Click **"Clause graph"** in the sidebar navigation (`/clause-graph`).
2. **Verify Graph Canvas:**
   - Displays nodes representing clauses and color-coded by risk (coral = High, amber = Medium, lime = Low).
   - Solid lines represent explicit contractual triggers.
   - Dashed lines represent statutory or inferred dependencies.
3. **Interactive Inspection:**
   - Click on `CLAUSE 12` (Termination).
   - The inspector on the right updates to show `Impact Level: High Exposure` and connected outbound/inbound relationship paths.
   - Click on an outbound connection button (e.g., `CLAUSE 21 · TRIGGERS`) to navigate the path.

---

### Feature 6: Deadline Radar & Notification Sequence
1. Click **"Reminders"** in the sidebar navigation (`/reminders`).
2. **Upcoming Obligations:**
   - Check the upcoming task cards (e.g., *"Serve 60-day termination notice"*).
   - Click the checkmark circle on a task:
     - The task toggles to `COMPLETED` with strike-through styling.
     - Click it again to toggle back to `PENDING`.
3. **Custom Reminder Creation:**
   - Click **"+ Add reminder"** in the top right.
   - Enter:
     - *Title:* `"Submit lease renewal confirmation"`
     - *Clause Reference:* `"Clause 07 · Page 4"`
     - *Deadline:* Select any upcoming date/time.
   - Click **"Create reminder"**.
   - **Pass Criteria:** The task appears in the timeline with a `3-stage sequence enabled` badge (T−72h, T−24h, T−5h).

---

### Feature 7: One-Click HMAC Email Action URLs
To verify the email webhook security:
1. In your browser, test an invalid action link:
   ```text
   http://localhost:5000/api/tasks/action?taskId=test&action=done&token=invalid_token
   ```
   **Pass Criteria:** Returns HTTP `403` with a branded `"Action Verification Failed"` view.

2. Test generating and resolving a valid task action:
   Run in terminal:
   ```bash
   cd backend
   node -e "import('./src/utils/tokenGenerator.js').then(g => { const t = g.generateActionToken('task_demo_1', 'done'); console.log('Test Done Link: http://localhost:5000/api/tasks/action?taskId=task_demo_1&action=done&token=' + t); })"
   ```
   Open the printed URL in your browser:
   **Pass Criteria:** Displays the dark-mode confirmation page: **"Task Marked as Completed"**, recording the obligation as satisfied.

---

## 4. Test Summary Matrix

| Module | Feature Tested | Verification Method | Status |
| :--- | :--- | :--- | :--- |
| **Backend** | Health & MongoDB Atlas Connectivity | `GET /api/health` | ✅ Verified |
| **Backend** | In-Memory Privacy Ingestion | `POST /api/documents/analyze` | ✅ Verified |
| **Backend** | Vector Embeddings & Ephemeral TTL | 24-hr TTL Index on `document_vectors` | ✅ Verified |
| **Backend** | Graph-Augmented RAG Copilot | `POST /api/chat/query` | ✅ Verified |
| **Backend** | Automated Deadline Email Scheduler | Agenda.js & Nodemailer (T−72h, T−24h, T−5h) | ✅ Verified |
| **Backend** | HMAC One-Click Action Security | `GET /api/tasks/action` | ✅ Verified |
| **Frontend** | Interactive Document Dropzone | Upload modal in `App.tsx` | ✅ Verified |
| **Frontend** | Live Contract Intelligence Dashboard | Reactive state in `Home.tsx` | ✅ Verified |
| **Frontend** | Clause Intelligence & Search | Filters & search in `ClauseIntelligence.tsx` | ✅ Verified |
| **Frontend** | Interactive Clause Relationship DAG | Node hopping in `ClauseGraph.tsx` | ✅ Verified |
| **Frontend** | Speech Sanitizer & TTS Player | Web Speech API in `speechSanitizer.ts` | ✅ Verified |
| **Frontend** | Deadline Radar & Task Toggle | Live task state in `Reminders.tsx` | ✅ Verified |
