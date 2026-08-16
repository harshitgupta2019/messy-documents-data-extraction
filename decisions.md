# Engineering Decisions

## 1. Three document families
I chose invoices, bank statements and resumes rather than claiming arbitrary-document support. They have materially different structures and demonstrate that the pipeline generalizes.

**Cut:** contracts, receipts and purchase orders.

## 2. Normalize files before extraction
PDF text and OCR output enter one extraction pipeline. This keeps ingestion provider-independent and makes failures easier to reason about.

## 3. LLM + deterministic fallback
An OpenAI-compatible structured-output call is used when configured. A deterministic extractor remains available so reviewers can run the project without credentials.

**Tradeoff:** fallback extraction is intentionally narrower than the LLM path.

## 4. Schema-driven extraction
Each type has an explicit schema and application validation. This makes extracted data predictable and queryable.

## 5. Validation outside the model
Financial arithmetic is checked in application code. The LLM extracts; deterministic code decides whether numbers reconcile.

## 6. Confidence and provenance
Every extracted field stores confidence and page information. This supports review rather than silently accepting questionable values.

## 7. Safe natural-language queries
The query endpoint translates a constrained set of natural-language questions into allow-listed Mongo filters. Arbitrary Mongo/JavaScript generation was deliberately rejected for security and correctness.

## 8. Review state
Validation conflicts produce `needs_review`. The system should prefer visible uncertainty over silently storing incorrect financial information.

## 9. Async-ready processing
Upload and processing are separated conceptually. A production deployment can move processing to BullMQ/Redis workers without changing the API/data contract.

**Cut:** full worker deployment to keep the five-day scope focused.
