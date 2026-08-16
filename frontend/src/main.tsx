import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
function App() {
  const [d, setD] = useState<any[]>([]),
    [s, setS] = useState(""),
    [sel, setSel] = useState<any>(),
    [q, setQ] = useState(""),
    [ans, setAns] = useState<any>();
  const load = () =>
    fetch(API + "/documents" + (s ? "?q=" + encodeURIComponent(s) : ""))
      .then((r) => r.json())
      .then(setD);
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 300);

    return () => clearTimeout(timer);
  }, [s]);
  async function up(f: File) {
    const x = new FormData();
    x.append("file", f);
    const a = await fetch(API + "/documents", { method: "POST", body: x }).then(
      (r) => r.json(),
    );
    const t = setInterval(async () => {
      const z = await fetch(API + "/documents/" + a._id).then((r) => r.json());
      setD((v) => v.map((i) => (i._id === z._id ? z : i)));
      if (z.status !== "processing") {
        clearInterval(t);
        setSel(z);
      }
    }, 600);
  }
  async function ask() {
    setAns(
      await fetch(API + "/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      }).then((r) => r.json()),
    );
  }
  return (
    <div className="wrap">
      <header>
        <div>
          <small>DOCQUERY</small>
          <h1>Messy documents, made queryable.</h1>
          <p>Extract, validate, review and search real-world documents.</p>
        </div>
        <label className="btn">
          + Upload
          <input
            hidden
            type="file"
            onChange={(e) => e.target.files?.[0] && up(e.target.files[0])}
          />
        </label>
      </header>
      <div className="tags">
        <i>PDF</i>
        <i>OCR</i>
        <i>Invoice</i>
        <i>Bank statement</i>
        <i>Resume</i>
      </div>
      <div className="ask">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask: show invoices from Acme above 100000"
        />
        <button onClick={ask}>Ask</button>
      </div>
      {ans && (
        <div className="answer">
          <div className="answer-header">
            <div>
              <b>{ans.count} results</b>
              <p>{ans.explanation?.join(" · ")}</p>
            </div>
          </div>

          <div className="answer-results">
            {ans.results?.map((doc: any) => (
              <button
                className="card"
                key={doc._id}
                onClick={() => setSel(doc)}
              >
                <div>
                  <b>
                    {doc.extractedData?.invoiceNumber ||
                      doc.extractedData?.accountHolder ||
                      doc.extractedData?.name ||
                      doc.filename}
                  </b>

                  <small>
                    {doc.extractedData?.vendor ||
                      doc.extractedData?.accountHolder ||
                      doc.documentType}
                  </small>

                  {doc.extractedData?.total !== undefined && (
                    <small>
                      ₹{Number(doc.extractedData.total).toLocaleString("en-IN")}
                    </small>
                  )}
                </div>
                <em className={doc.status}>{doc.status}</em>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="search">
        <input
          value={s}
          onChange={(e) => setS(e.target.value)}
          placeholder="Search extracted data…"
        />
        <span>{d.length} documents</span>
      </div>
      <main>
        <section>
          {d.map((x) => (
            <button className="card" onClick={() => setSel(x)} key={x._id}>
              <div>
                <b>
                  {x.extractedData?.invoiceNumber ||
                    x.extractedData?.accountHolder ||
                    x.extractedData?.name ||
                    x.filename}
                </b>
                <small>{x.documentType}</small>
              </div>
              <em className={x.status}>{x.status}</em>
            </button>
          ))}
        </section>
        <section className="detail">
          {sel ? (
            <>
              <div className="top">
                <div>
                  <small>{sel.filename}</small>
                  <h2>{sel.documentType}</h2>
                </div>
                <em className={sel.status}>{sel.status}</em>
              </div>
              {sel.validation?.errors?.length > 0 && (
                <div className="warn">
                  <b>Needs review</b>
                  <span>{sel.validation.errors.join(" ")}</span>
                </div>
              )}
              <div className="fields">
                {sel.fields?.map((f: any) => (
                  <div>
                    <small>{f.name}</small>
                    <b>
                      {Array.isArray(f.value)
                        ? f.value.join(", ")
                        : String(f.value || "—")}
                    </b>
                    <span>
                      {Math.round(f.confidence * 100)}% confidence · page{" "}
                      {f.source?.page}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty">
              Select a document to inspect its extracted fields.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
