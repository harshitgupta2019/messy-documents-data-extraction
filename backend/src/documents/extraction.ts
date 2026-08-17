export type DocumentType = "invoice" | "bank_statement" | "resume" | "unknown";
const get = (t: string, l: string) =>
  new RegExp(`^${l}:\\s*(.+)$`, "mi").exec(t)?.[1]?.trim() || "";
const num = (t: string, l: string) =>
  Number(get(t, l).replace(/[₹$,\s]/g, "")) || 0;
export function classify(t: string): DocumentType {
  const x = t.toLowerCase();
  if (x.includes("invoice number") || x.includes("subtotal:")) return "invoice";
  if (x.includes("account holder") || x.includes("opening balance"))
    return "bank_statement";
  if (
    x.includes("resume") ||
    x.includes("skills:") ||
    x.includes("experience:")
  )
    return "resume";
  return "unknown";
}
export function extract(type: DocumentType, t: string) {
  if (type === "invoice")
    return {
      vendor: get(t, "Vendor"),
      invoiceNumber: get(t, "Invoice Number"),
      invoiceDate: get(t, "Invoice Date"),
      currency: get(t, "Currency") || "INR",
      subtotal: num(t, "Subtotal"),
      tax: num(t, "Tax"),
      total: num(t, "Total"),
    };
  if (type === "bank_statement")
    return {
      accountHolder: get(t, "Account Holder"),
      accountNumber: get(t, "Account Number"),
      period: get(t, "Statement Period"),
      openingBalance: num(t, "Opening Balance"),
      credits: num(t, "Credits"),
      debits: num(t, "Debits"),
      closingBalance: num(t, "Closing Balance"),
    };
  if (type === "resume")
    return {
      name: get(t, "Name"),
      email: get(t, "Email"),
      phone: get(t, "Phone"),
      location: get(t, "Location"),
      skills: get(t, "Skills")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      experience: get(t, "Experience"),
      education: get(t, "Education"),
    };
  return { raw: t };
}
export function validate(type: DocumentType, d: any) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (type === "invoice") {
    if (Math.round((d.subtotal + d.tax) * 100) !== Math.round(d.total * 100))
      errors.push("Subtotal + tax does not equal total.");
    if (!d.vendor) warnings.push("Vendor is missing.");
  }
  if (type === "bank_statement") {
    if (
      Math.round((d.openingBalance + d.credits - d.debits) * 100) !==
      Math.round(d.closingBalance * 100)
    )
      errors.push("Opening + credits - debits does not equal closing balance.");
    if (!d.accountHolder) warnings.push("Account holder is missing.");
  }
  if (type === "resume") {
    if (!d.name) warnings.push("Name is missing.");
    if (!d.email) warnings.push("Email is missing.");
  }
  return {
    valid: !errors.length,
    status: errors.length || warnings.length ? "needs_review" : "accepted",
    errors,
    warnings,
  };
}
export function schema(type: DocumentType) {
  return type === "invoice"
    ? {
        type: "object",
        properties: {
          vendor: { type: "string" },
          invoiceNumber: { type: "string" },
          invoiceDate: { type: "string" },
          currency: { type: "string" },
          subtotal: { type: "number" },
          tax: { type: "number" },
          total: { type: "number" },
        },
        required: ["vendor", "invoiceNumber", "total"],
      }
    : type === "bank_statement"
      ? {
          type: "object",
          properties: {
            accountHolder: { type: "string" },
            accountNumber: { type: "string" },
            period: { type: "string" },
            openingBalance: { type: "number" },
            credits: { type: "number" },
            debits: { type: "number" },
            closingBalance: { type: "number" },
          },
          required: ["accountHolder", "closingBalance"],
        }
      : {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            location: { type: "string" },
            skills: { type: "array", items: { type: "string" } },
            experience: { type: "string" },
            education: { type: "string" },
          },
          required: ["name", "email"],
        };
}
