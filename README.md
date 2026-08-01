# QurioDB

QurioDB is a desktop-first database management and analytics platform built with a React/Vite frontend, a FastAPI backend, and a Tauri desktop shell.

The desktop app is the primary target. It bundles the React UI and starts the Python API as a local sidecar process, so users do not need to run a backend manually.

## Quick Launch

This project includes local scripts for easy startup:

- **Web Browser Version**: double-click `run-web.bat` to launch the API and open the web interface.
- **Desktop Application**: double-click `run-desktop.bat` to launch the standalone desktop app.

## Desktop Application (.msi)

The desktop app is built with Tauri 2 and includes an embedded Python FastAPI sidecar for local/offline operation.

### Download Installer

[Download Installer Directly (v1.0.0)](https://github.com/trungvinh2102/QurioDB/releases/download/1.0.0/QurioDB_1.0.0_x64_en-US.msi)

This link points to the current stable release. To download the latest official version, visit the [Releases Page](https://github.com/trungvinh2102/QurioDB/releases).

### Build from Source

To generate a fresh `.msi` installer:

1. Ensure all dependencies are installed: `bun install`
2. Build the desktop package:

   ```bash
   bun run desktop:build
   ```

3. The setup file is generated under `apps/desktop/src-tauri/target/`.

## Architecture

- **Frontend (`apps/web`)**: React 19, Vite 6, TypeScript, Tailwind CSS 4, shadcn-style primitives, TanStack Query/Table, Monaco Editor, and Zustand.
- **Backend (`apps/api`)**: FastAPI, SQLAlchemy, SQLite metadata storage, database connectors, import flows, and AI/RAG services.
- **Desktop (`apps/desktop`)**: Tauri 2 wrapper with single-instance enforcement, dynamic loopback FastAPI sidecar startup, nonce-authenticated readiness, and shutdown cleanup.

### Desktop startup

The desktop shell keeps one running instance and focuses the existing window when a second launch is attempted. On each launch, Rust allocates an available loopback port and a per-launch startup nonce, then passes `QURIODB_DESKTOP_PORT`, `QURIODB_STARTUP_NONCE`, `QURIODB_DESKTOP_PARENT_PID`, and the desktop-only sidecar settings to the bundled API. Rust verifies `GET /api/desktop/health` with that nonce before publishing the typed API URL and generation state to the React frontend. The frontend configures its API client before rendering the desktop application; startup failures remain actionable through **Retry** and **Quit**.

Browser development remains independent of this flow and defaults to `http://127.0.0.1:5000/api/` unless `VITE_API_URL` is set.

## Setup & Development

### Requirements

- Bun 1.3.6+
- Node.js 20+
- Python 3.10+
- Rust/Cargo for desktop builds

### Installation

```bash
bun install
pip install -r apps/api/requirements.txt
```

### Database Setup

QurioDB uses SQLite automatically for its internal system metadata.

On first run, it creates a local database file at:

```text
~/.quriodb/quriodb.db
```

No external system database is required for the app metadata store.

### Initialize & Seed

The backend initializes tables on first run. If you want to seed default data manually:

```bash
python apps/api/scripts/seed.py
```

Default admin credentials are `admin` / `password123` when no users exist.

### Running in Development

```bash
# Start web and API
bun run dev

# Start only the web app
bun run dev:web

# Start only the backend
bun run dev:backend
```

### Desktop Sidecar Sync

If you modify Python code under `apps/api/` and need those changes in the desktop app, rebuild the sidecar:

```powershell
powershell -ExecutionPolicy Bypass -File build-backend.ps1
```

Tauri uses prebuilt sidecar binaries from `apps/desktop/src-tauri/bin/`. Without a rebuild, the desktop app can keep running an older `api.exe`.

## Environment Configuration

The frontend resolves API URLs automatically for browser development and Tauri desktop mode.

To customize the API target during a Vite build, set:

```powershell
$env:VITE_API_URL="http://127.0.0.1:5000/api/"
```

## AI Assistant

QurioDB's AI Assistant is available primarily in SQL Lab and is configured from **Settings -> AI Assistant**. It supports chat, SQL generation, explanation, optimization, repair, autocomplete, safe agent execution, conversation history, feedback, diagnostics, and database-aware RAG.

### AI Runtime

The backend uses LangChain as the provider runtime and keeps OpenAI-style chat messages as the internal message format. Provider adapters currently support:

- OpenAI-compatible models
- Google Gemini
- Anthropic Claude
- Qwen
- DeepSeek

Provider API keys are stored from **Settings -> AI Assistant** in QurioDB's encrypted local metadata database. Desktop users should configure provider keys through the app UI instead of passing keys through environment variables.

Qwen and DeepSeek default to OpenAI-compatible endpoints. Override them only when needed:

```powershell
$env:QWEN_BASE_URL="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
$env:DEEPSEEK_BASE_URL="https://api.deepseek.com"
```

### AI Settings

The AI settings screen manages:

- **AI Gateway**: preferred provider and encrypted API key.
- **Model Library**: available models, default models, active status, and model capabilities.
- **Task Routing**: per-task model assignment and fallback models for SQL tasks.
- **Router Terms**: intent and behavior routing terms that control shallow/deep RAG and reasoning modes.
- **RAG Index**: database schema sync, saved-query sync, optional query-history sync, file/URL/text ingestion, and retrieval evaluation.
- **Vector Store Map**: visual inspection of indexed sources, chunks, pipeline stages, and vector backend status.

### RAG Pipeline

RAG is enabled by default and is desktop-safe. The default vector backend is SQLite JSON storage, with optional `sqlite_vec` acceleration when available.

The RAG layer can index:

- database schemas
- saved queries
- query history, only when explicitly enabled
- uploaded files: PDF, DOCX, Markdown, text, and HTML
- public URLs
- manually entered text

Core RAG endpoints are exposed under `/api/rag`, including:

- `GET /api/rag/status`
- `GET /api/rag/pipeline/status`
- `POST /api/rag/pipeline/sync/database/{database_id}`
- `POST /api/rag/pipeline/plan`
- `POST /api/rag/ingest/file`
- `POST /api/rag/ingest/url`
- `POST /api/rag/evaluate`

RAG environment controls:

```powershell
$env:QURIODB_RAG_ENABLED="true"
$env:QURIODB_RAG_VECTOR_BACKEND="sqlite_json" # sqlite_json or sqlite_vec
$env:QURIODB_RAG_RERANK_ENABLED="true"
$env:QURIODB_RAG_INGEST_MAX_BYTES="10485760"
$env:QURIODB_RAG_INGEST_URL_TIMEOUT="10"
```

URL ingestion blocks private, local, and reserved hosts by default. For local research only, this can be relaxed with:

```powershell
$env:QURIODB_RAG_ALLOW_PRIVATE_URLS="true"
```

### Document Indexing And Chunking Flow

Document ingestion uses desktop-safe local parsers first, then passes extracted text into the generalized RAG indexer.

```mermaid
flowchart TD
  User[User adds source in AI Settings] --> SourceType{Source type}

  SourceType -->|File upload| File[POST /api/rag/ingest/file]
  SourceType -->|Public URL| Url[POST /api/rag/ingest/url]
  SourceType -->|Manual text| Text[POST /api/rag/index/source]

  File --> Extract[Extract text by file type]
  Url --> Guard[Validate http/https URL and block private/local/reserved hosts]
  Guard --> Fetch[Fetch with urllib request and size/timeout limits]
  Fetch --> Extract
  Text --> Clean[Use submitted plain text]

  Extract --> Pdf[pypdf for PDF]
  Extract --> Docx[python-docx for DOCX]
  Extract --> Html[stdlib HTMLParser for visible HTML text]
  Extract --> Plain[utf-8-sig, utf-8, then cp1252 text decode]

  Pdf --> Normalize[Normalize whitespace and remove empty lines]
  Docx --> Normalize
  Html --> Normalize
  Plain --> Normalize
  Clean --> Normalize

  Normalize --> Redact[Mask obvious secrets: api key, token, password, secret]
  Redact --> SectionSplit[Heading-aware Markdown section split]
  SectionSplit --> Window[Sliding word window: target 700 words, overlap 100 words]
  Window --> Chunks[RagChunk rows with paragraph content, ordinal, token estimate, citation]
  Chunks --> Source[RagSource row with title, uri, access scope, content hash]
  Chunks --> Embedding{Gemini embedding available?}
  Embedding -->|Yes| Vector[Gemini embeddings model models/gemini-embedding-2-preview]
  Embedding -->|No| LexicalOnly[Keep lexical-only chunks]
  Vector --> Store[(RagEmbedding JSON vector in SQLite)]
  Vector --> Vec{QURIODB_RAG_VECTOR_BACKEND}
  Vec -->|sqlite_json| Store
  Vec -->|sqlite_vec| SqliteVec[Mirror vectors into sqlite-vec tables]
```

Chunking strategies by source:

- **Documents and web pages**: heading-aware Markdown section split, then sliding word windows of about 700 words with 100-word overlap.
- **Database schema**: one object-aware table chunk per table, plus one compact `schema_graph` chunk for relationships and join planning.
- **Saved queries**: one reusable SQL knowledge chunk per saved query.
- **Query history**: one query chunk per history item after masking quoted strings and numeric literals.

### Retrieval Flow

When an AI stream needs database or document context, QurioDB retrieves chunks with a hybrid lexical/semantic path and keeps permission filtering inside the local metadata store.

```mermaid
flowchart TD
  Prompt[User prompt] --> Router[QueryUnderstandingService]
  Router --> Intent[Intent, behavior, rag_mode, reasoning_mode, source_types]
  Intent --> NeedRag{needs_retrieval?}
  NeedRag -->|No| Empty[Build prompt without retrieved evidence]
  NeedRag -->|Yes| Bootstrap{Need database_schema and no chunks found?}
  Bootstrap -->|Yes| IndexSchema[Index schema chunks automatically]
  Bootstrap -->|No| Load
  IndexSchema --> Load[Load visible RagSource + RagChunk + optional RagEmbedding rows]

  Load --> ACL[Filter by databaseId, sourceType, and user visibility]
  ACL --> Lexical[Lexical score from expanded query terms]
  ACL --> Semantic{Embedding available?}
  Semantic -->|Yes| QueryEmbed[Embed query with Gemini retrieval-query task]
  QueryEmbed --> VecBackend{sqlite_vec scores available?}
  VecBackend -->|Yes| VecSearch[Use sqlite-vec semantic scores]
  VecBackend -->|No| Cosine[Cosine similarity against stored JSON vectors]
  Semantic -->|No| LexicalFallback[Semantic score empty]

  Lexical --> Fuse[Reciprocal rank fusion]
  VecSearch --> Fuse
  Cosine --> Fuse
  LexicalFallback --> Fuse
  Fuse --> Rerank[Deterministic rerank: exact object/schema/source-type boosts]
  Rerank --> Budget[Token budget and duplicate citation filtering]
  Budget --> Context[RAG context with identifier contract, citations, warnings, retrieval trace]
```

### Streaming And Observability

AI chat streams over Server-Sent Events from:

```text
POST /api/ai/stream
```

The stream persists conversation snapshots and retrieval traces so the frontend can render thinking, SQL, analysis, citations, warnings, and diagnostics without storing provider secrets or raw prompts in diagnostic responses.

```mermaid
sequenceDiagram
  autonumber
  participant UI as SQL Lab AI Assistant
  participant Client as aiApi.streamChat
  participant Route as POST /api/ai/stream
  participant Store as SQLite metadata DB
  participant Service as AIService
  participant RAG as RAG pipeline
  participant Runtime as LangChain runtime
  participant Model as Provider model

  UI->>Client: Send messages, databaseId, modelId, taskKey
  Client->>Route: fetch text/event-stream
  Route->>Store: Ensure conversation and save user message
  Route->>Service: stream_generate_response(...)

  Service-->>Route: event thinking: model preflight
  Service->>Runtime: validate_model_ready(probe_remote=true)
  Runtime->>Model: minimal probe call
  Model-->>Runtime: OK or provider error

  Service->>Service: Quick general response check
  alt general quick reply
    Service-->>Route: event message
  else normal AI path
    Service->>RAG: understand_query(...)
    RAG-->>Service: intent, behavior, rag_mode, source_types
    Service->>Service: resolve task model and provider
    opt database/document request
      Service->>RAG: build_context_for_understanding(...)
      RAG-->>Service: context, citations, retrieval_trace, warnings
      Service-->>Route: event retrieval_trace
      Service-->>Route: event citations
      Service-->>Route: event warnings
    end
    Service->>Runtime: stream_text(system_prompt, prompt, history)
    Runtime->>Model: provider stream
    Model-->>Runtime: text chunks
    Runtime-->>Service: normalized chunks
    Service->>Service: TaggedResponseStreamParser
    Service-->>Route: semantic events: thinking, message, sql, analysis, confidence, suggestions
  end

  Route->>Store: Persist assistant snapshot after each event
  Route-->>Client: SSE event/data frames
  Client->>Client: Parse event: and data: lines
  Client-->>UI: onChunk(content, event)
  UI->>UI: Render thinking, SQL, analysis, citations, warnings, suggestions
```

For SQL-generation intents, the stream has an additional safety path: QurioDB extracts generated SQL, runs a read-only preview through `sql_execution_verifier.preview`, and asks the model to repair failed SQL up to two times before returning a warning.

LangSmith tracing is opt-in:

```powershell
$env:LANGSMITH_TRACING="true"
$env:LANGSMITH_API_KEY="your-langsmith-key"
$env:LANGSMITH_PROJECT="QurioDB AI Assistant"
```

Use the RAG regression suite for AI/RAG backend changes:

```bash
bun run test:rag
```

## License

Internal Development - QurioDB Team.

---

QurioDB Team - v1.0.0
