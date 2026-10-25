# AgentLab — AI Agent Simulation & Testing Platform

> **"What happens when you give an AI a world?"**  
> Where AI agents meet reality: Simulate realistic scenarios, inject system faults, observe live traces, and evaluate performance before real-world deployment.

---

## 🌟 Architecture Overview

AgentLab is an autonomous AI agent simulation and evaluation platform engineered for rigorous behavioral and safety verification.

```
+-------------------------------------------------------------------------------+
|                               Frontend (React 19)                            |
| Overview Panel | Agent Connection | World Builder | Live Simulation | Results |
+---------------------------------------+---------------------------------------+
                                        | HTTP / SSE Stream
+---------------------------------------v---------------------------------------+
|                         Backend (Node.js 22 + Express 5)                      |
|  - REST API Routes (/api/agents, /api/worlds, /api/experiments, /api/health)  |
|  - Structured Logging & Authentication Middleware                             |
|  - Centralized Error Handling & SSRF Boundary Check                           |
+-------------------+-------------------+-------------------+-------------------+
                    |                   |                   |
+-------------------v---+ +-------------v-----+ +-----------v-----+
|   Simulation Engine   | |    RAG Pipeline   | | Storage & Models|
| - Adapter Dispatch    | | - Auto Chunking   | | - Mongoose      |
| - Tool Failure Inject | | - TF-IDF Lexical  | | - MongoDB       |
| - Real Evaluation     | | - Citations       | | - No Fake Mocks |
+-----------------------+ +-------------------+ +-----------------+
```

---

## 🎯 Supported Agent Adapters

1. **Built-in Deterministic Agent (`SampleSupportAgent`)**:
   - Out-of-the-box reproducibility without external LLM API keys.
   - Evaluates multi-step return eligibility, policy checking, adversarial prompt injection defense, and fault interception.
2. **HTTP/API Agent Adapter (`ApiAgentAdapter`)**:
   - Connects to external REST endpoints.
   - Configurable authentication (Bearer token, X-API-Key, Basic Auth), request mapping, response mapping, and custom timeouts.
   - Strict SSRF network protection: Restricts loopback (`127.0.0.1`), cloud metadata (`169.254.169.254`), and private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
3. **CLI Agent Adapter (`CliAgentAdapter`)**:
   - Sandboxed local subprocess execution for approved binaries (`node`, `python`, `python3`, `deno`, `bun`, `sh`, `bash`).
   - Guarded by `ENABLE_CLI_RUNNER=true` in server environment; forbids shell chaining (`;&|`).
4. **Project Import Adapter (`ProjectImportAdapter`)**:
   - Repository URL inspection (`github.com/owner/repo`) for entrypoints and dependencies.
   - Requires isolated Docker container runner (`AGENT_RUNNER_URL`). If not configured, reports configuration required rather than claiming untrusted code was executed.

---

## 💾 Database Architecture (MongoDB with Mongoose)

- **Mongoose Models**:
  - `AgentModel`: Schema with connection type, auth credentials, tool bindings, and status indexes.
  - `WorldModel`: Schema with system rules, customer profiles, and simulated tool registries.
  - `KnowledgeDocumentModel`: Real text chunking with discrete section passages, token counts, and compound indexes (`{ worldId: 1, category: 1 }`).
  - `ScenarioModel`: Benchmark scenarios with injected faults, customer traits, and expected outcomes.
  - `ExperimentModel`: Full experiment run records, timestamps, progress, and embedded scenario runs.
  - `ExecutionEventModel`: Granular event log with timestamps and action types (`tool_call`, `policy_check`, `failure_injected`).
  - `EvaluationResultModel`: Deterministic metrics persisted for historical review.
- **Strict Error Handling**:
  - If `MONGODB_URI` is missing or MongoDB is unreachable, the system explicitly reports database unconfigured (`HTTP 503` / alert banner).
  - Silent fallback to fake database records is strictly disabled.

---

## 📊 Evaluation Metrics Formulation

1. **Task Completion Rate**:
   $$\text{Task Completion Rate} = \frac{\text{Runs where agent reached terminal conclusion}}{\text{Total Scenarios}} \times 100$$
2. **Correct Outcome Rate**:
   $$\text{Correct Outcome Rate} = \frac{\text{Runs matching expected decision (e.g. refund/reject/escalate)}}{\text{Total Scenarios}} \times 100$$
3. **Policy Compliance Rate**:
   $$\text{Policy Compliance Rate} = \frac{\text{Runs with zero policy violations and correct policy cited}}{\text{Total Scenarios}} \times 100$$
4. **Tool-Call Success Rate**:
   $$\text{Tool Success Rate} = \frac{\text{Successful Tool Calls}}{\text{Total Invocations}} \times 100$$
5. **Categorized Failures**:
   - Every failed scenario records the exact expected outcome, actual outcome, category, explanation, observed evidence, and suggested remediation.

---

## 🛠️ Environment Variables (.env.example)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | Backend server port | `3001` |
| `CLIENT_URL` | Frontend origin for CORS | `http://localhost:5173` |
| `MONGODB_URI` | MongoDB connection string (Required for DB operations) | `mongodb://localhost:27017/agentlab` |
| `JWT_SECRET` | Secret key for JWT verification | `replace_with_min_32_chars` |
| `ENCRYPTION_KEY` | Hex encryption key for third-party credentials | Optional |
| `LLM_PROVIDER` | Active LLM provider (`builtin-deterministic`, `openai`, `gemini`) | `builtin-deterministic` |
| `LLM_API_KEY` | External LLM API key | Optional (Built-in agent runs without key) |
| `LLM_MODEL` | External LLM model identifier | Optional |
| `GITHUB_TOKEN` | Token for inspecting private GitHub repositories | Optional |
| `AGENT_RUNNER_URL` | URL to isolated Docker container runner | Optional |
| `AGENT_RUNNER_TOKEN` | Bearer token for isolated runner service | Optional |
| `ENABLE_CLI_RUNNER` | Security gate to enable local CLI subprocesses | `false` |

---

## 🚀 Setup and Run Commands

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Test Suite
```bash
npm test
```
*Executes all 17 automated tests covering adapters, tools, RAG chunking, metric calculations, and Mongoose schemas.*

### 3. Build Production Client
```bash
npm run build
```

### 4. Start Production Server (Client + API)
```bash
npm start
```
*Launches server on `http://localhost:3001`.*

### 5. Start Development Servers (Hot-Reloading)
```bash
# Terminal 1: Backend API
node --experimental-strip-types server/index.ts

# Terminal 2: Vite Frontend Dev Server
npm run dev
```

---

## 🧪 Automated Test Results

Executed via Node.js native test runner (`node --test`):

```text
✔ SampleSupportAgent: executes standard return scenario and cites Policy #24
✔ SampleSupportAgent: handles injected tool failure (HTTP 503) and escalates to manager
✔ ApiAgentAdapter: blocks private IP and localhost SSRF destinations
✔ CliAgentAdapter: blocks execution when ENABLE_CLI_RUNNER is not set
✔ ProjectImportAdapter: reports configuration required when AGENT_RUNNER_URL is missing
✔ SimulationEngine.calculateEvaluation: accurately separates task completion from policy compliance
✔ Mongoose AgentModel: validates required fields and default connectionType
✔ Mongoose AgentModel: rejects invalid connectionType enum
✔ Mongoose WorldModel: validates required fields and structures
✔ MongoStore: throws DatabaseNotConfiguredError when MongoDB is disconnected
✔ LocalRAGPipeline: chunks document into discrete section passages
✔ LocalRAGPipeline: retrieves matching passage with score and citation
✔ LocalRAGPipeline: returns empty array for empty or stop-word only query
✔ ShopSphereToolRegistry: lookup_order retrieves order record
✔ ShopSphereToolRegistry: check_refund_eligibility evaluates 30-day window
✔ ShopSphereToolRegistry: handles injected fault error (HTTP 503)
✔ ShopSphereToolRegistry: escalate_to_manager generates priority tracking ticket

Total Tests: 17 passed | 0 failed
```

---

## ⚠️ Known Limitations & Deployment Notes

1. **Isolated Container Execution**:
   - Arbitrary imported GitHub repositories or user scripts are intentionally not executed inside the Express process to prevent arbitrary remote code execution (RCE).
   - An external container runner service (`AGENT_RUNNER_URL`) running Docker or Firecracker microVMs is required for untrusted project runs.
2. **MongoDB Connection**:
   - When running without a live MongoDB instance, the application explicitly displays an unconfigured connection notice. Configure `MONGODB_URI` to persist data across sessions.
