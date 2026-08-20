'use client';

import { useRef, useState } from 'react';
import { ACCEPT, extract, kindOf } from '@/lib/extract';

type Question = { id:number; type:'mcq'|'short'|'long'; question:string; answer:string; explanation:string; source:string; options:string[]|null };

export default function Home(){
  const input=useRef<HTMLInputElement>(null);
  const [file,setFile]=useState<File|null>(null);
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');
  const [text,setText]=useState('');
  const [questions,setQuestions]=useState<Question[]>([]);
  const [generating,setGenerating]=useState(false);

  async function choose(f:File){
    setError(''); setQuestions([]); setFile(f); setText(''); setStatus('Reading document…');
    try{
      const result=await extract(f,(done,total)=>setStatus(`Reading page ${done} of ${total}…`));
      setText(result.text);
      setStatus(`${result.kind.toUpperCase()} content extracted. Ready to generate questions.`);
    }catch(e){setFile(null);setStatus('');setError(e instanceof Error?e.message:'Could not read this file.');}
  }

  async function generateQuestions(){
    if(!text) return;
    setError(''); setGenerating(true); setStatus('AI is analyzing your study material and creating exam questions…');
    try{
      const response=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||'Question generation failed.');
      setQuestions(data.questions||[]);
      setStatus(`Done — ${data.questions?.length||0} questions generated from your material.`);
    }catch(e){setError(e instanceof Error?e.message:'Question generation failed.');setStatus('');}
    finally{setGenerating(false);}
  }

  return <main>
    <section className="hero"><div><div>AI EXAM PREP · MVP</div><h1>Turn your study material into practice questions</h1><p>Upload your PDF, Word document, PowerPoint, or study image. We extract the content first, then use AI to create questions grounded in what you uploaded.</p></div></section>
    <section className="wrap"><div className="card">
      {!file ? <div className="drop" onClick={()=>input.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)choose(f)}}><div className="icon">↑</div><h2>Drop your study material here</h2><p className="muted">or click to browse your computer</p><button className="button" type="button">Choose file</button><div className="formats">PDF · DOCX · PPTX · PNG · JPG · JPEG · WEBP · up to 25 MB</div></div>:
      <><div className="file"><strong>{file.name}</strong><span className="muted">{kindOf(file)?.toUpperCase()}</span></div><div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:14}}><button className="button" onClick={()=>input.current?.click()}>Choose another file</button>{text && <button className="button" onClick={generateQuestions} disabled={generating}>{generating?'Generating…':'Generate 10 Questions with AI'}</button>}</div></>}
      <input ref={input} hidden type="file" accept={ACCEPT} onChange={e=>{const f=e.target.files?.[0];if(f)choose(f);e.currentTarget.value=''}} />
      {status && <p className="muted" style={{marginTop:18}}>{status}</p>}
      {error && <div className="error">{error}</div>}
      {questions.length>0 && <div className="result"><h2>{questions.length} AI-generated practice questions</h2>{questions.map(q=><article className="q" key={q.id}><span className="badge">{q.type.toUpperCase()} · Question {q.id}</span><h3>{q.question}</h3>{q.options && <ol>{q.options.map((option,i)=><li key={i}>{option}</li>)}</ol>}<p><strong>Answer:</strong> {q.answer}</p><p><strong>Why:</strong> {q.explanation}</p><p className="muted"><strong>Source:</strong> {q.source}</p></article>)}</div>}
      {text && <details style={{marginTop:24}}><summary className="muted">View extracted content</summary><p className="muted" style={{whiteSpace:'pre-wrap',lineHeight:1.6}}>{text.slice(0,10000)}{text.length>10000?'…':''}</p></details>}
    </div></section>
  </main>
}
