import type { TextGenerationPipeline } from '@huggingface/transformers';

const MODEL_ID = 'onnx-community/SmolLM2-360M-Instruct-ONNX';
let generatorPromise: Promise<TextGenerationPipeline> | null = null;

export type LocalQuestion = {
  id: number;
  type: 'mcq' | 'short' | 'long';
  question: string;
  answer: string;
  explanation: string;
  source: string;
  options: string[] | null;
};

async function getGenerator(onProgress?: (message: string) => void) {
  if (!generatorPromise) {
    generatorPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      onProgress?.('Downloading the free local AI model (first time only)…');
      return pipeline('text-generation', MODEL_ID, { dtype: 'q4' });
    })();
  }
  return generatorPromise;
}

function cleanJson(raw: string): LocalQuestion[] {
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('The local AI returned an unreadable result. Please try again.');
  const parsed = JSON.parse(raw.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error('The local AI returned an invalid question list.');
  return parsed.slice(0, 10).map((q: any, i) => ({
    id: i + 1,
    type: q.type === 'mcq' || q.type === 'long' ? q.type : 'short',
    question: String(q.question ?? '').trim(),
    answer: String(q.answer ?? '').trim(),
    explanation: String(q.explanation ?? '').trim(),
    source: String(q.source ?? '').trim(),
    options: Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : null,
  })).filter(q => q.question && q.answer);
}

export async function generateLocalQuestions(text: string, onProgress?: (message: string) => void): Promise<LocalQuestion[]> {
  const generator: any = await getGenerator(onProgress);
  const material = text.slice(0, 12000);
  const prompt = `You are an exam question generator. Use ONLY the study material below. Create exactly 10 questions. Mix 4 MCQ, 3 short-answer, and 3 long-answer questions. MCQs must have exactly four options. Give a concise answer, explanation, and a short source phrase copied from the material. Return ONLY a JSON array with objects containing: id, type, question, answer, explanation, source, options.\n\nSTUDY MATERIAL:\n${material}`;
  onProgress?.('The local AI is generating questions on this device…');
  const output = await generator(prompt, { max_new_tokens: 1000, do_sample: false, return_full_text: false });
  const raw = Array.isArray(output) ? String(output[0]?.generated_text ?? '') : String(output?.generated_text ?? output ?? '');
  const questions = cleanJson(raw);
  if (questions.length < 5) throw new Error('The local AI could not generate enough reliable questions. Try a shorter or clearer document.');
  return questions;
}
