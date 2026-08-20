import OpenAI from "openai";
import { NextResponse } from "next/server";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      minItems: 10,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "integer" },
          type: { type: "string", enum: ["mcq", "short", "long"] },
          question: { type: "string" },
          answer: { type: "string" },
          explanation: { type: "string" },
          source: { type: "string" },
          options: { type: ["array", "null"], items: { type: "string" } }
        },
        required: ["id", "type", "question", "answer", "explanation", "source", "options"]
      }
    }
  },
  required: ["questions"]
};

export async function POST(request: Request) {
  try {
    const { text, count = 10 } = await request.json();
    if (typeof text !== "string" || text.trim().length < 80) {
      return NextResponse.json({ error: "Not enough study content was extracted." }, { status: 400 });
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured. Add it to the server environment before generating questions." }, { status: 503 });
    }

    const client = new OpenAI({ apiKey });
    const source = text.slice(0, 80000);
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      store: false,
      instructions: "You are an exam-preparation question generator. Use ONLY the supplied study material. Do not invent facts. Create exactly 10 useful questions covering the important concepts. Mix MCQ, short-answer, and long-answer questions. For MCQs provide exactly 4 options. Every answer and explanation must be supported by the source. The source field should quote a short identifying phrase from the supplied material, not a fabricated citation.",
      input: `Study material:\n\n${source}`,
      text: {
        format: {
          type: "json_schema",
          name: "exam_questions",
          strict: true,
          schema
        }
      }
    });

    const parsed = JSON.parse(response.output_text);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Question generation failed", error);
    return NextResponse.json({ error: "Question generation failed. Check the server configuration and try again." }, { status: 500 });
  }
}
