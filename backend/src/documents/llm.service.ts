import { Injectable } from "@nestjs/common";
import { DocumentType, extract, schema } from "./extraction";
@Injectable()
export class LlmService {
  async run(type: DocumentType, text: string) {
    if (process.env.LLM_ENABLED !== "true" || !process.env.LLM_API_KEY)
      return {
        data: extract(type, text),
        provider: "deterministic",
        confidence: 0.88,
      };
    try {
      const url =
        (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(
          /\/$/,
          "",
        ) + "/chat/completions";
      const body = {
        model: process.env.LLM_MODEL || "gpt-4o-mini",
        temperature: 0,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: type + "_document",
            strict: true,
            schema: schema(type),
          },
        },
        messages: [
          {
            role: "system",
            content:
              "Extract only facts present in the document. Never invent values.",
          },
          { role: "user", content: text.slice(0, 50000) },
        ],
      };
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw Error(`LLM HTTP ${r.status}`);
      const j: any = await r.json();
      return {
        data: JSON.parse(j.choices[0].message.content),
        provider: "llm",
        confidence: 0.95,
      };
    } catch (e) {
      return {
        data: extract(type, text),
        provider: "deterministic-fallback",
        confidence: 0.65,
        warning: String(e),
      };
    }
  }
}
