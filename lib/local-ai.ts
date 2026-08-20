import type { TextGenerationPipeline } from '@huggingface/transformers';

// Small quantized model chosen for browser memory limits.
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
      env.useBrowserCache = true;
      onProgress?.('Loading the lightweight free AI model (first time only)…');
      return pipeline('text-generation', MODEL_ID, {
        dtype: 'q4',
        device: 'wasm',
      });
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

  // Keep the prompt deliberately small so low-RAM phones/laptops do not exhaust WASM memory.
  const material = text.replace(/\s+/g, ' ').trim().slice(0, 4500);
  const prompt = `You create exam questions from study material. Use ONLY the material. Return ONLY valid JSON array. Create 6 questions: 2 mcq, 2 short, 2 long. MCQ has four options. Each object has id,type,question,answer,explanation,source,options. Keep answers and explanations short.\n\nSTUDY MATERIAL:\n${material}`;

  onProgress?.('Free AI is generating questions on this device…');
  const output = await generator(prompt, {
    max_new_tokens: 450,
    do_sample: false,
    return_full_text: false,
  });
  const raw = Array.isArray(output) ? String(output[0]?.generated_text ?? '') : String(output?.generated_text ?? output ?? '');
  const questions = cleanJson(raw);
  if (questions.length < 3) throw new Error('The lightweight local AI could not generate enough questions. Try a shorter or clearer document.');
  return questions;
}
