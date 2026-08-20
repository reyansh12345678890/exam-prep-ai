'use client';

import { useRef, useState } from 'react';
import { ACCEPT, extract, kindOf } from '@/lib/extract';

const sampleQuestions = (text:string) => {
  const sentences = text.split(/[.!?]\s+/).map(s=>s.trim()).filter(s=>s.length>45).slice(0,10);
  return sentences.map((s,i)=>({id:i+1, q:`What is the key idea explained in the following study material?`, answer:s}));
};

export default function Home(){
  const input=useRef<HTMLInputElement>(null);
  const [file,setFile]=useState<File|null>(null);
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');
  const [text,setText]=useState('');
  const [questions,setQuestions]=useState<{id:number,q:string,answer:string}[]>([]);

  async function choose(f:File){
    setError(''); setQuestions([]); setFile(f); setStatus('Reading document…');
    try{
      const result=await extract(f,(done,total)=>setStatus(`Reading page ${done} of ${total}…`));
      setText(result.text);
      setStatus(`Ready — ${result.kind.toUpperCase()} content extracted.`);
      setQuestions(sampleQuestions(result.text));
    }catch(e){setStatus('');setError(e instanceof Error?e.message:'Could not read this file.');}
  }

  return <main>
    <section className="hero"><div><div>AI EXAM PREP · MVP</div><h1>Turn your study material into practice questions</h1><p>Upload your PDF, Word document, PowerPoint, or study image. We extract the content first, then turn it into exam practice.</p></div></section>
    <section className="wrap"><div className="card">
      {!file ? <div className="drop" onClick={()=>input.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)choose(f)}}><div className="icon">↑</div><h2>Drop your study material here</h2><p className="muted">or click to browse your computer</p><button className="button" type="button">Choose file</button><div className="formats">PDF · DOCX · PPTX · PNG · JPG · JPEG · WEBP · up to 25 MB</div></div>:
      <><div className="file"><strong>{file.name}</strong><span className="muted">{kindOf(file)?.toUpperCase()}</span></div><button className="button" onClick={()=>input.current?.click()}>Choose another file</button></>}
      <input ref={input} hidden type="file" accept={ACCEPT} onChange={e=>{const f=e.target.files?.[0];if(f)choose(f)}} />
      {status && <p className="muted" style={{marginTop:18}}>{status}</p>}
      {error && <div className="error">{error}</div>}
      {questions.length>0 && <div className="result"><h2>{questions.length} content-grounded practice questions</h2>{questions.map(q=><article className="q" key={q.id}><span className="badge">Question {q.id}</span><h3>{q.q}</h3><p><strong>Source-based answer:</strong> {q.answer}</p></article>)}</div>}
      {text && <details style={{marginTop:24}}><summary className="muted">View extracted content</summary><p className="muted" style={{whiteSpace:'pre-wrap',lineHeight:1.6}}>{text.slice(0,10000)}</p></details>}
    </div></section>
  </main>
}