import { QueryService } from "./query.service";
test("query parsing", () => {
  const s = new QueryService({} as any);
  const p = s.parse("show invoices above 100000");
  expect(p.filter.documentType).toBe("invoice");
  expect(p.explanation).toHaveLength(2);
});
