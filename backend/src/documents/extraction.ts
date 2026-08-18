export type DocumentType =
  | "invoice"
  | "bank_statement"
  | "resume"
  | "unknown";

/**
 * Extract a value from either:
 *
 *   Vendor: Acme Technologies
 *
 * OR PDF text formatted as:
 *
 *   Vendor
 *   Acme Technologies
 */
const get = (text: string, label: string) => {
  // Format: "Label: value"
  const inline = new RegExp(
    `^${escapeRegExp(label)}\\s*:\\s*(.+)$`,
    "mi",
  ).exec(text);

  if (inline?.[1]) {
    return inline[1].trim();
  }

  // Format:
  // Label
  // value
  const lines = text
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  const normalizedLabel = label
    .toLowerCase()
    .replace(/\s+/g, " ");

  for (let i = 0; i < lines.length - 1; i++) {
    const current = lines[i]
      .toLowerCase()
      .replace(/[:\s]+$/, "")
      .replace(/\s+/g, " ");

    if (current === normalizedLabel) {
      return lines[i + 1].trim();
    }
  }

  return "";
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const num = (text: string, label: string) => {
  const value = get(text, label);

  const cleaned = value.replace(
    /[₹$€£,\s]/g,
    "",
  );

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
};

export function classify(text: string): DocumentType {
  const x = text.toLowerCase();

  /*
   * Invoice signals
   */
  const invoiceSignals = [
    "tax invoice",
    "invoice no",
    "invoice number",
    "invoice date",
    "subtotal",
    "bill to",
    "amount due",
    "total",
  ];

  const invoiceScore =
    invoiceSignals.filter((signal) =>
      x.includes(signal),
    ).length;

  if (invoiceScore >= 2) {
    return "invoice";
  }

  /*
   * Bank statement signals
   */
  const bankSignals = [
    "bank statement",
    "account holder",
    "account number",
    "opening balance",
    "closing balance",
    "statement period",
    "transaction date",
    "debit",
    "credit",
  ];

  const bankScore =
    bankSignals.filter((signal) =>
      x.includes(signal),
    ).length;

  if (bankScore >= 2) {
    return "bank_statement";
  }

  /*
   * Resume signals
   */
  const resumeSignals = [
    "resume",
    "curriculum vitae",
    "professional summary",
    "work experience",
    "education",
    "skills",
    "employment",
  ];

  const resumeScore =
    resumeSignals.filter((signal) =>
      x.includes(signal),
    ).length;

  if (resumeScore >= 2) {
    return "resume";
  }

  return "unknown";
}

export function extract(
  type: DocumentType,
  text: string,
) {
  if (type === "invoice") {
    return {
      vendor: get(text, "Vendor"),
      invoiceNumber:
        get(text, "Invoice Number") ||
        get(text, "Invoice No"),
      invoiceDate: get(text, "Invoice Date"),
      currency:
        get(text, "Currency") || "INR",
      subtotal: num(text, "Subtotal"),
      tax: num(text, "Tax"),
      total: num(text, "Total"),
    };
  }

  if (type === "bank_statement") {
    return {
      accountHolder: get(
        text,
        "Account Holder",
      ),
      accountNumber: get(
        text,
        "Account Number",
      ),
      period:
        get(text, "Statement Period") ||
        get(text, "Period"),
      openingBalance: num(
        text,
        "Opening Balance",
      ),
      credits: num(text, "Credits"),
      debits: num(text, "Debits"),
      closingBalance: num(
        text,
        "Closing Balance",
      ),
    };
  }

  if (type === "resume") {
    return {
      name: get(text, "Name"),
      email: get(text, "Email"),
      phone: get(text, "Phone"),
      location: get(text, "Location"),
      skills: get(text, "Skills")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      experience: get(text, "Experience"),
      education: get(text, "Education"),
    };
  }

  return {
    raw: text,
  };
}

export function validate(
  type: DocumentType,
  data: any,
) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (type === "invoice") {
    const subtotal = Number(data.subtotal) || 0;
    const tax = Number(data.tax) || 0;
    const total = Number(data.total) || 0;

    /*
     * Only perform the arithmetic check when
     * all relevant monetary fields are present.
     */
    if (
      subtotal > 0 &&
      tax >= 0 &&
      total > 0 &&
      Math.round((subtotal + tax) * 100) !==
        Math.round(total * 100)
    ) {
      errors.push(
        "Subtotal + tax does not equal total.",
      );
    }

    if (!data.vendor) {
      warnings.push("Vendor is missing.");
    }

    if (!data.invoiceNumber) {
      warnings.push(
        "Invoice number is missing.",
      );
    }

    if (!data.invoiceDate) {
      warnings.push(
        "Invoice date is missing.",
      );
    }

    if (!data.total) {
      warnings.push("Total is missing.");
    }
  }

  if (type === "bank_statement") {
    const opening =
      Number(data.openingBalance) || 0;
    const credits =
      Number(data.credits) || 0;
    const debits =
      Number(data.debits) || 0;
    const closing =
      Number(data.closingBalance) || 0;

    if (
      closing !== 0 &&
      Math.round(
        (opening + credits - debits) * 100,
      ) !== Math.round(closing * 100)
    ) {
      errors.push(
        "Opening + credits - debits does not equal closing balance.",
      );
    }

    if (!data.accountHolder) {
      warnings.push(
        "Account holder is missing.",
      );
    }

    if (!data.closingBalance) {
      warnings.push(
        "Closing balance is missing.",
      );
    }
  }

  if (type === "resume") {
    if (!data.name) {
      warnings.push("Name is missing.");
    }

    if (!data.email) {
      warnings.push("Email is missing.");
    }
  }

  return {
    valid: errors.length === 0,
    status:
      errors.length || warnings.length
        ? "needs_review"
        : "accepted",
    errors,
    warnings,
  };
}

export function schema(
  type: DocumentType,
) {
  if (type === "invoice") {
    return {
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
      required: [
        "vendor",
        "invoiceNumber",
        "total",
      ],
    };
  }

  if (type === "bank_statement") {
    return {
      type: "object",
      properties: {
        accountHolder: {
          type: "string",
        },
        accountNumber: {
          type: "string",
        },
        period: {
          type: "string",
        },
        openingBalance: {
          type: "number",
        },
        credits: {
          type: "number",
        },
        debits: {
          type: "number",
        },
        closingBalance: {
          type: "number",
        },
      },
      required: [
        "accountHolder",
        "closingBalance",
      ],
    };
  }

  return {
    type: "object",
    properties: {
      name: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      location: { type: "string" },
      skills: {
        type: "array",
        items: { type: "string" },
      },
      experience: { type: "string" },
      education: { type: "string" },
    },
    required: ["name", "email"],
  };
}