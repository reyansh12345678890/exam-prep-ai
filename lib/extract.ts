import JSZip from 'jszip';

export type SupportedKind = 'pdf' | 'docx' | 'pptx' | 'image';
export type Extracted = { text: string; kind: SupportedKind; pages?: number };

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const ACCEPT = '.pdf,.docx,.pptx,.png,.jpg,.jpeg,.webp';

export function kindOf(file: File): SupportedKind | null {
  const n = file.name.toLowerCase();
  if (n.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
  if (n.endsWith('.docx') || file.type.includes('wordprocessingml')) return 'docx';
  if (n.endsWith('.pptx') || file.type.includes('presentationml')) return 'pptx';
  if (/\.(png|jpe?g|webp)$/.test(n) || file.type.startsWith('image/')) return 'image';
  return null;
}

export async function extract(file: File, onProgress?: (done: number, total: number) => void): Promise<Extracted> {
  if (file.size > MAX_FILE_BYTES) throw new Error('File is larger than 25 MB. Please split it into smaller files.');
  const kind = kindOf(file);
  if (!kind) throw new Error('Unsupported file. Please upload PDF, Word, PowerPoint, PNG, JPG, JPEG, or WEBP.');

  if (kind === 'image') {
    throw new Error('Image upload is supported, but OCR/handwriting recognition is the next AI phase.');
  }
  if (kind === 'pdf') return extractPdf(file, onProgress);
  if (kind === 'docx') return extractDocx(file);
  return extractPptx(file);
}

async function extractPdf(file: File, onProgress?: (done:number,total:number)=>void): Promise<Extracted> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages:string[] = [];
  for (let i=1;i<=doc.numPages;i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((x: any) => 'str' in x ? x.str : '').join(' ').replace(/\s+/g,' ').trim());
    onProgress?.(i, doc.numPages);
  }
  const text = pages.filter(Boolean).join('\n\n');
  if (text.replace(/\s/g,'').length < 80) throw new Error('This PDF has little or no selectable text. It may be scanned or handwritten; vision/OCR support is next.');
  return { text, kind:'pdf', pages:doc.numPages };
}

async function extractDocx(file: File): Promise<Extracted> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entry = zip.file('word/document.xml');
  if (!entry) throw new Error('This Word document does not contain a readable document body.');
  const xml = await entry.async('string');
  const paragraphs = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(m => decodeXml(m[1]));
  const text = paragraphs.join(' ').replace(/\s+/g, ' ').trim();
  if (!text) throw new Error('No readable text was found in this Word document.');
  return { text, kind:'docx' };
}

async function extractPptx(file: File): Promise<Extracted> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const names = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/i.test(n));
  names.sort((a,b)=>Number(a.match(/slide(\d+)/i)?.[1])-Number(b.match(/slide(\d+)/i)?.[1]));
  const texts:string[] = [];
  for (const name of names) {
    const entry = zip.file(name);
    if (!entry) continue;
    const xml = await entry.async('string');
    const matches = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map(m => decodeXml(m[1]));
    if (matches.length) texts.push(matches.join(' '));
  }
  const text = texts.join('\n\n').replace(/\s+/g,' ').trim();
  if (!text) throw new Error('No readable text was found in this PowerPoint. Image-only slides will need vision/OCR support.');
  return { text, kind:'pptx', pages:names.length };
}

function decodeXml(s:string) {
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
}
