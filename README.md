# DocQuery — Zamp Engineering Project

Turns messy/semi-structured documents into structured, validated and queryable data.

## Supported
- PDF text extraction
- Image OCR
- Text documents
- Invoice, bank statement and resume classification
- Schema-driven extraction
- OpenAI-compatible LLM extraction when configured
- Deterministic fallback without an API key
- Field confidence + page provenance
- Financial validation + needs-review workflow
- Structured search
- Natural-language query parsing with safe allow-listed filters
- MongoDB persistence
- Redis-ready architecture
- Tests
- Docker Compose

## Run
Requirements: Node 20+, Docker.

```bash
docker compose up -d
npm run install:all
cp backend/.env.example backend/.env
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3000

Optional LLM:
```env
LLM_ENABLED=true
LLM_API_KEY=...
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1
```

Without an API key the deterministic extractor keeps the project runnable.

## API
POST /documents (multipart `file`)
GET /documents?q=...
GET /documents/:id
POST /query `{ "question": "show invoices from Acme above 100000" }`
GET /health
