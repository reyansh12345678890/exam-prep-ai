import type { TextGenerationPipeline } from '@huggingface/transformers';

// Smallest practical browser model for low-memory devices.
const MODEL_ID = 'onnx-community/SmolLM2-135M-Instruct-ONNX-MHA';
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
      env.useLocalModels = false;
      env.useBrowserCache = true;
      onProgress?.('Loading lightweight free AI (first time only)…');
      return pipeline('text-generation', MODEL_ID, { dtype: 'q4', device: 'wasm' });
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
  return parsed.slice(0, 6).map((q: any, i) => ({
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

  // Keep context and output very small for browsers with limited WASM memory.
  const material = text.replace(/\s+/g, ' ').trim().slice(0, 2500);
  const prompt = `Create 3 exam questions from ONLY this material. Return ONLY a JSON array. Use 1 mcq, 1 short, 1 long. MCQ has four options. Fields: id,type,question,answer,explanation,source,options. Keep every field very short.\n\nMATERIAL:\n${material}`;

  onProgress?.('Free AI is generating questions on this device…');
  const output = await generator(prompt, {
    max_new_tokens: 220,
    do_sample: false,
    return_full_text: false,
  });
  const raw = Array.isArray(output) ? String(output[0]?.generated_text ?? '') : String(output?.generated_text ?? output ?? '');
  const questions = cleanJson(raw);
  if (questions.length < 2) throw new Error('The lightweight local AI could not generate enough questions. Try a shorter document.');
  return questions;
}
