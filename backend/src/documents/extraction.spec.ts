import { classify, validate } from "./extraction";
test("classification", () => {
  expect(classify("Invoice Number: 1")).toBe("invoice");
  expect(classify("Account Holder: A")).toBe("bank_statement");
  expect(classify("Resume Skills: Node.js")).toBe("resume");
});
test("invoice arithmetic", () =>
  expect(
    validate("invoice", { vendor: "A", subtotal: 100, tax: 10, total: 120 })
      .valid,
  ).toBe(false));
