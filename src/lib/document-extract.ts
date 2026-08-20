import mammoth from "mammoth";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const SUPPORTED_EXTENSIONS = ["pdf", "docx", "pptx", "png", "jpg", "jpeg", "webp"] as const;

export type DocumentKind = "pdf" | "docx" | "pptx" | "image";

export interface ExtractedDocument {
  fileName: string;
  kind: DocumentKind;
  text: string;
  pages?: { pageNumber: number; text: string }[];
}

export class DocumentExtractionError extends Error {}

function extension(file: File) {
  return file.name.toLowerCase().split(".").pop() ?? "";
}

export function validateDocument(file: File) {
  if (file.size > MAX_FILE_BYTES) {
    throw new DocumentExtractionError("File is larger than 25 MB. Please split large study material into smaller files.");
  }
  if (!SUPPORTED_EXTENSIONS.includes(extension(file) as (typeof SUPPORTED_EXTENSIONS)[number])) {
    throw new DocumentExtractionError("Unsupported file. Use PDF, Word, PowerPoint, PNG, JPG, JPEG, or WEBP.");
  }
}

export async function extractDocument(file: File, onProgress?: (done: number, total: number) => void): Promise<ExtractedDocument> {
  validateDocument(file);
  const ext = extension(file);
  if (ext === "pdf") return extractPdf(file, onProgress);
  if (ext === "docx") return extractDocx(file);
  if (ext === "pptx") return extractPptx(file);
  throw new DocumentExtractionError("This image is ready for the handwriting/vision pipeline. OCR is the next step before questions can be generated from it.");
}

async function extractPdf(file: File, onProgress?: (done: number, total: number) => void): Promise<ExtractedDocument> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: { pageNumber: number; text: string }[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ").replace(/\s+/g, " ").trim();
    pages.push({ pageNumber: i, text });
    onProgress?.(i, doc.numPages);
  }
  const text = pages.map((p) => p.text).filter(Boolean).join("\n\n");
  if (text.replace(/\s/g, "").length < 100) {
    throw new DocumentExtractionError("This PDF has little or no selectable text. It may be scanned or handwritten; use an image or wait for vision/OCR support.");
  }
  return { fileName: file.name, kind: "pdf", text, pages };
}

async function extractDocx(file: File): Promise<ExtractedDocument> {
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  const text = result.value.replace(/\s+/g, " ").trim();
  if (!text) throw new DocumentExtractionError("No readable text was found in this Word document.");
  return { fileName: file.name, kind: "docx", text };
}

async function extractPptx(file: File): Promise<ExtractedDocument> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/i)?.[1]) - Number(b.match(/slide(\d+)/i)?.[1]));
  const pages: { pageNumber: number; text: string }[] = [];
  for (let i = 0; i < slideNames.length; i++) {
    const xml = await zip.files[slideNames[i]].async("text");
    const parsed = parser.parse(xml);
    const texts: string[] = [];
    const walk = (value: unknown) => {
      if (typeof value === "string") return;
      if (Array.isArray(value)) return value.forEach(walk);
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        if (key === "t" && typeof child === "string") texts.push(child);
        else walk(child);
      }
    };
    walk(parsed);
    pages.push({ pageNumber: i + 1, text: texts.join(" ").replace(/\s+/g, " ").trim() });
  }
  const text = pages.map((p) => p.text).filter(Boolean).join("\n\n");
  if (!text) throw new DocumentExtractionError("No readable text was found in this PowerPoint.");
  return { fileName: file.name, kind: "pptx", text, pages };
}
