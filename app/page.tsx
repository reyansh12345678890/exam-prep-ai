'use client';

import { useMemo, useRef, useState } from 'react';
import { ACCEPT, extract, kindOf } from '@/lib/extract';
import { generateLocalQuestions, type LocalQuestion } from '@/lib/local-ai';

type Question = LocalQuestion;

export default function Home(){
  const input=useRef<HTMLInputElement>(null);
  const [file,setFile]=useState<File|null>(null);
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');
  const [text,setText]=useState('');
  const [questions,setQuestions]=useState<Question[]>([]);
  const [generating,setGenerating]=useState(false);
  const [revealed,setRevealed]=useState<number[]>([]);
  const [query,setQuery]=useState('');
  const [activeType,setActiveType]=useState<'all'|'mcq'|'short'|'long'>('all');

  async function choose(f:File){
    setError(''); setQuestions([]); setRevealed([]); setFile(f); setText(''); setStatus('Reading document…');
    try{
      const result=await extract(f,(done,total)=>setStatus(`Reading page ${done} of ${total}…`));
      setText(result.text);
      setStatus(`${result.kind.toUpperCase()} content extracted. Ready for free local AI.`);
    }catch(e){setFile(null);setStatus('');setError(e instanceof Error?e.message:'Could not read this file.');}
  }

  async function generateQuestions(){
    if(!text) return;
    setError(''); setGenerating(true);
    try{
      const data=await generateLocalQuestions(text,setStatus);
      setQuestions(data);
      setStatus(`Done — ${data.length} questions generated privately on your device.`);
    }catch(e){setError(e instanceof Error?e.message:'Local question generation failed.');setStatus('');}
    finally{setGenerating(false);}
  }

  function reset(){
    setFile(null); setText(''); setQuestions([]); setRevealed([]); setQuery(''); setActiveType('all'); setStatus(''); setError('');
  }

  function toggleAnswer(id:number){
    setRevealed(current=>current.includes(id) ? current.filter(value=>value!==id) : [...current,id]);
  }

  function downloadQuestions(){
    const content=questions.map(q=>`${q.id}. ${q.question}\nAnswer: ${q.answer}\nWhy: ${q.explanation}\nSource: ${q.source}`).join('\n\n');
    const url=URL.createObjectURL(new Blob([content],{type:'text/plain'}));
    const link=document.createElement('a'); link.href=url; link.download='studyforge-practice-questions.txt'; link.click(); URL.revokeObjectURL(url);
  }

  const visibleQuestions=useMemo(()=>questions.filter(q=>
    (activeType==='all' || q.type===activeType) &&
    (!query || `${q.question} ${q.answer}`.toLowerCase().includes(query.toLowerCase()))
  ),[questions,activeType,query]);

  return <main>
    <section className="hero"><div><div className="eyebrow">STUDYFORGE · PRIVATE LOCAL AI</div><h1>Study smarter from the material you already have</h1><p>Turn PDF, Word, and PowerPoint notes into a focused practice session. Your document stays on your device and the lightweight AI model runs in your browser.</p><div className="trust-row"><span>🔒 Private by design</span><span>⚡ No API key</span><span>📚 Learn from your notes</span></div></div></section>
    <section className="wrap"><div className="card">
      {!file ? <div className="drop" onClick={()=>input.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)choose(f)}}><div className="icon">↑</div><h2>Drop your study material here</h2><p className="muted">or click to browse your computer</p><button className="button" type="button">Choose file</button><div className="formats">PDF · DOCX · PPTX · PNG · JPG · JPEG · WEBP · up to 25 MB</div></div>:
      <><div className="file"><div><strong>{file.name}</strong><div className="muted">{kindOf(file)?.toUpperCase()} · {(file.size/1024/1024).toFixed(2)} MB</div></div><button className="text-button" onClick={reset}>Remove</button></div><div className="action-row"><button className="button secondary" onClick={()=>input.current?.click()}>Choose another file</button>{text && <button className="button" onClick={generateQuestions} disabled={generating}>{generating?'Generating locally…':'Generate practice set'}</button>}</div></>}
      <input ref={input} hidden type="file" accept={ACCEPT} onChange={e=>{const f=e.target.files?.[0];if(f)choose(f);e.currentTarget.value=''}} />
      {status && <p className="muted" style={{marginTop:18}}>{status}</p>}
      {error && <div className="error">{error}</div>}
      {questions.length>0 && <div className="result"><div className="result-header"><div><p className="eyebrow dark">PRACTICE SESSION</p><h2>{visibleQuestions.length} of {questions.length} questions</h2></div><button className="button secondary" onClick={downloadQuestions}>Download set</button></div><div className="filters"><input className="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search questions…" aria-label="Search questions" /><div className="filter-row">{(['all','mcq','short','long'] as const).map(type=><button key={type} className={`filter ${activeType===type?'selected':''}`} onClick={()=>setActiveType(type)}>{type==='all'?'All':type.toUpperCase()}</button>)}</div></div>{visibleQuestions.map(q=><article className="q" key={q.id}><span className="badge">{q.type.toUpperCase()} · Question {q.id}</span><h3>{q.question}</h3>{q.options && <ol>{q.options.map((option,i)=><li key={i}>{option}</li>)}</ol>}<button className="text-button" onClick={()=>toggleAnswer(q.id)}>{revealed.includes(q.id)?'Hide answer':'Reveal answer'}</button>{revealed.includes(q.id) && <div className="answer"><p><strong>Answer:</strong> {q.answer}</p><p><strong>Why:</strong> {q.explanation}</p><p className="muted"><strong>Source:</strong> {q.source}</p></div>}</article>)}</div>}
      {text && <details style={{marginTop:24}}><summary className="muted">View extracted content</summary><p className="muted" style={{whiteSpace:'pre-wrap',lineHeight:1.6}}>{text.slice(0,10000)}{text.length>10000?'…':''}</p></details>}
    </div></section>
  </main>
}
