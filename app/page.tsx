'use client';

import { useMemo, useRef, useState } from 'react';
import { ACCEPT, extract, kindOf } from '@/lib/extract';
import { generateLocalQuestions, type LocalQuestion } from '@/lib/local-ai';

type Module = 'overview' | 'library' | 'planner' | 'practice' | 'coding' | 'visuals' | 'progress';
type Question = LocalQuestion;

const modules: { id: Module; icon: string; label: string; description: string }[] = [
  { id: 'overview', icon: '⌂', label: 'Overview', description: 'Your study cockpit' },
  { id: 'library', icon: '▣', label: 'Study Library', description: 'Notes and documents' },
  { id: 'planner', icon: '◷', label: 'Study Planner', description: 'Plan your week' },
  { id: 'practice', icon: '✦', label: 'Practice Lab', description: 'Quizzes and flashcards' },
  { id: 'coding', icon: '</>', label: 'Coding Lab', description: 'Learn by building' },
  { id: 'visuals', icon: '◇', label: 'Visual Studio', description: 'Diagrams and mind maps' },
  { id: 'progress', icon: '↗', label: 'Progress', description: 'Track your growth' },
];

export default function Home() {
  const input = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState<Module>('overview');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [generating, setGenerating] = useState(false);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState<'all' | 'mcq' | 'short' | 'long'>('all');
  const [tasks, setTasks] = useState(['Review algebra formulas', 'Complete one practice set', 'Revise yesterday’s flashcards']);
  const [newTask, setNewTask] = useState('');
  const [code, setCode] = useState('def binary_search(items, target):\n    left, right = 0, len(items) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if items[mid] == target:\n            return mid\n        if items[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1');

  async function choose(f: File) {
    setError(''); setQuestions([]); setRevealed([]); setFile(f); setText(''); setStatus('Reading document…');
    try {
      const result = await extract(f, (done, total) => setStatus(`Reading page ${done} of ${total}…`));
      setText(result.text); setStatus(`${result.kind.toUpperCase()} content extracted. Ready for free local AI.`);
    } catch (e) { setFile(null); setStatus(''); setError(e instanceof Error ? e.message : 'Could not read this file.'); }
  }

  async function generateQuestions() {
    if (!text) return;
    setError(''); setGenerating(true);
    try {
      const data = await generateLocalQuestions(text, setStatus);
      setQuestions(data); setActive('practice');
      setStatus(`Done — ${data.length} questions generated privately on your device.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Local question generation failed.'); setStatus(''); }
    finally { setGenerating(false); }
  }

  function reset() {
    setFile(null); setText(''); setQuestions([]); setRevealed([]); setStatus(''); setError('');
  }

  const visibleQuestions = useMemo(() => questions.filter(q =>
    (activeType === 'all' || q.type === activeType) &&
    (!query || `${q.question} ${q.answer}`.toLowerCase().includes(query.toLowerCase()))
  ), [questions, activeType, query]);

  function addTask() {
    if (newTask.trim()) { setTasks([...tasks, newTask.trim()]); setNewTask(''); }
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">✦</span><div><strong>StudyForge</strong><small>AI exam companion</small></div></div>
      <div className="privacy-note"><span>●</span><div><strong>Private mode</strong><small>Your files stay in this browser</small></div></div>
      <nav>{modules.map(item => <button key={item.id} className={active === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setActive(item.id)}><span>{item.icon}</span><div><strong>{item.label}</strong><small>{item.description}</small></div></button>)}</nav>
      <div className="sidebar-bottom"><span>⚙</span> Settings <span className="version">v1.0</span></div>
    </aside>
    <section className="content">
      <header className="topbar"><div><span className="mobile-brand">✦ StudyForge</span><p className="eyebrow dark">WEDNESDAY, SEPTEMBER 9</p><h1>{modules.find(m => m.id === active)?.label}</h1></div><div className="streak">🔥 <strong>4 day streak</strong><small>Keep it going!</small></div></header>
      {active === 'overview' && <Overview setActive={setActive} questions={questions} tasks={tasks} />}
      {active === 'library' && <Library file={file} text={text} input={input} choose={choose} reset={reset} status={status} error={error} generating={generating} generateQuestions={generateQuestions} />}
      {active === 'planner' && <Planner tasks={tasks} newTask={newTask} setNewTask={setNewTask} addTask={addTask} />}
      {active === 'practice' && <Practice questions={questions} visibleQuestions={visibleQuestions} query={query} setQuery={setQuery} activeType={activeType} setActiveType={setActiveType} revealed={revealed} toggleAnswer={id => setRevealed(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])} />}
      {active === 'coding' && <Coding code={code} setCode={setCode} />}
      {active === 'visuals' && <Visuals text={text} />}
      {active === 'progress' && <Progress questions={questions} />}
    </section>
  </main>;
}

function Overview({ setActive, questions, tasks }: { setActive: (m: Module) => void; questions: Question[]; tasks: string[] }) {
  return <><section className="welcome"><div><p className="eyebrow">YOUR PERSONAL STUDY COPILOT</p><h2>Good evening, learner 👋</h2><p>Small, focused sessions add up. You’re building momentum.</p><button className="button" onClick={() => setActive('library')}>Start a study session <span>→</span></button></div><div className="orb">✦</div></section>
    <div className="metric-grid"><Metric icon="◷" label="Study time" value="2h 40m" note="+24% this week" positive /><Metric icon="✦" label="Questions solved" value={String(questions.length || 24)} note="Keep practicing" /><Metric icon="♢" label="Current streak" value="4 days" note="Best: 12 days" /><Metric icon="↗" label="Readiness" value="68%" note="On the right track" positive /></div>
    <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">FOCUS PLAN</p><h3>Today’s study plan</h3></div><button className="text-button" onClick={() => setActive('planner')}>View planner →</button></div>{tasks.slice(0, 3).map((task, i) => <div className="task-line" key={task}><span className={i === 0 ? 'check done' : 'check'}>{i === 0 ? '✓' : ''}</span><span>{task}</span><small>{i === 0 ? 'Complete' : `${25 + i * 15} min`}</small></div>)}</section><section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">QUICK START</p><h3>Choose your next move</h3></div></div><div className="quick-grid"><button onClick={() => setActive('library')}><span>▣</span><strong>Upload notes</strong><small>PDF, DOCX, PPTX</small></button><button onClick={() => setActive('coding')}><span>&lt;/&gt;</span><strong>Code practice</strong><small>Build your skills</small></button><button onClick={() => setActive('visuals')}><span>◇</span><strong>Make a diagram</strong><small>Visualize concepts</small></button><button onClick={() => setActive('practice')}><span>✦</span><strong>Take a quiz</strong><small>Test your knowledge</small></button></div></section></div></>;
}

function Metric({ icon, label, value, note, positive }: { icon: string; label: string; value: string; note: string; positive?: boolean }) { return <div className="metric"><span className="metric-icon">{icon}</span><small>{label}</small><strong>{value}</strong><em className={positive ? 'positive' : ''}>{note}</em></div>; }

function Library({ file, text, input, choose, reset, status, error, generating, generateQuestions }: { file: File | null; text: string; input: React.RefObject<HTMLInputElement | null>; choose: (f: File) => void; reset: () => void; status: string; error: string; generating: boolean; generateQuestions: () => void }) {
  return <section className="panel library-panel"><div className="panel-heading"><div><p className="eyebrow dark">LEARN FROM YOUR MATERIAL</p><h2>Study library</h2><p className="muted">Upload notes and turn them into a personalized practice set.</p></div></div>{!file ? <div className="drop" onClick={() => input.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) choose(f); }}><div className="icon">↑</div><h2>Drop study material here</h2><p className="muted">or click to browse your computer</p><button className="button" type="button">Choose file</button><div className="formats">PDF · DOCX · PPTX · up to 25 MB · processed locally</div></div> : <><div className="file"><div><strong>{file.name}</strong><div className="muted">{kindOf(file)?.toUpperCase()} · {(file.size / 1024 / 1024).toFixed(2)} MB</div></div><button className="text-button" onClick={reset}>Remove</button></div><div className="action-row"><button className="button secondary" onClick={() => input.current?.click()}>Choose another file</button>{text && <button className="button" onClick={generateQuestions} disabled={generating}>{generating ? 'Generating locally…' : 'Generate practice set'}</button>}</div></>}<input ref={input} hidden type="file" accept={ACCEPT} onChange={e => { const f = e.target.files?.[0]; if (f) choose(f); e.currentTarget.value = ''; }} />{status && <p className="status">{status}</p>}{error && <div className="error">{error}</div>}{text && <details className="extracted"><summary>View extracted content</summary><p>{text.slice(0, 10000)}{text.length > 10000 ? '…' : ''}</p></details>}</section>;
}

function Planner({ tasks, newTask, setNewTask, addTask }: { tasks: string[]; newTask: string; setNewTask: (v: string) => void; addTask: () => void }) { return <div className="planner-layout"><section className="panel"><p className="eyebrow dark">WEEKLY ROADMAP</p><h2>Build a plan you can keep</h2><p className="muted">A good plan is specific, realistic, and easy to restart.</p><div className="week"><div className="day"><strong>Mon</strong><span>✓</span><small>45 min</small></div><div className="day today"><strong>Today</strong><span>2</span><small>60 min</small></div>{['Thu', 'Fri', 'Sat', 'Sun'].map(day => <div className="day" key={day}><strong>{day}</strong><span>+</span><small>Plan</small></div>)}</div><h3>Today’s tasks</h3>{tasks.map((task, i) => <div className="task-line" key={task}><span className={i === 0 ? 'check done' : 'check'}>{i === 0 ? '✓' : ''}</span><span>{task}</span><small>{i === 0 ? 'Done' : 'To do'}</small></div>)}<div className="add-task"><input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} placeholder="Add a study task…" /><button className="button" onClick={addTask}>Add task</button></div></section><section className="panel coach"><span className="coach-icon">✦</span><p className="eyebrow">AI STUDY COACH</p><h3>Try a 25-minute focus sprint</h3><p className="muted">Short sessions reduce friction. Start with one topic, then take a five-minute break.</p><button className="button">Start focus timer</button></section></div>; }

function Practice({ questions, visibleQuestions, query, setQuery, activeType, setActiveType, revealed, toggleAnswer }: { questions: Question[]; visibleQuestions: Question[]; query: string; setQuery: (v: string) => void; activeType: 'all' | 'mcq' | 'short' | 'long'; setActiveType: (v: 'all' | 'mcq' | 'short' | 'long') => void; revealed: number[]; toggleAnswer: (id: number) => void }) { return <section className="panel"><div className="panel-heading"><div><p className="eyebrow dark">RETRIEVAL PRACTICE</p><h2>{questions.length ? `${visibleQuestions.length} of ${questions.length} questions` : 'Practice lab'}</h2><p className="muted">Generate questions from your notes, then test yourself before revealing the answer.</p></div></div>{!questions.length ? <div className="empty"><span>✦</span><h3>Your practice set is waiting</h3><p>Upload notes in Study Library to generate questions with free local AI.</p></div> : <><div className="filters"><input className="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search questions…" /><div className="filter-row">{(['all', 'mcq', 'short', 'long'] as const).map(type => <button key={type} className={`filter ${activeType === type ? 'selected' : ''}`} onClick={() => setActiveType(type)}>{type === 'all' ? 'All' : type.toUpperCase()}</button>)}</div></div>{visibleQuestions.map(q => <article className="q" key={q.id}><span className="badge">{q.type.toUpperCase()} · Question {q.id}</span><h3>{q.question}</h3>{q.options && <ol>{q.options.map((option, i) => <li key={i}>{option}</li>)}</ol>}<button className="text-button" onClick={() => toggleAnswer(q.id)}>{revealed.includes(q.id) ? 'Hide answer' : 'Reveal answer'}</button>{revealed.includes(q.id) && <div className="answer"><p><strong>Answer:</strong> {q.answer}</p><p><strong>Why:</strong> {q.explanation}</p><p className="muted"><strong>Source:</strong> {q.source}</p></div>}</article>)}</>}</section>; }

function Coding({ code, setCode }: { code: string; setCode: (v: string) => void }) { return <div className="coding-layout"><section className="panel"><p className="eyebrow dark">BUILD YOUR SKILLS</p><h2>Coding lab</h2><p className="muted">Paste code and use the local study assistant to reason about it. Start with a small function.</p><select className="select"><option>Python</option><option>JavaScript</option><option>Java</option><option>C++</option></select><textarea className="code-editor" value={code} onChange={e => setCode(e.target.value)} spellCheck={false} /><div className="code-actions"><button className="button">Explain line by line</button><button className="button secondary">Find a bug</button><button className="button secondary">Analyze complexity</button></div></section><section className="panel roadmap"><p className="eyebrow dark">DSA ROADMAP</p><h3>Your coding path</h3>{['Arrays & strings', 'Searching & sorting', 'Stacks & queues', 'Trees & graphs'].map((item, i) => <div className="roadmap-item" key={item}><span className={i < 2 ? 'check done' : 'check'}>{i < 2 ? '✓' : i + 1}</span><span>{item}</span><small>{i < 2 ? 'Complete' : 'Next'}</small></div>)}</section></div>; }

function Visuals({ text }: { text: string }) { return <div className="visual-layout"><section className="panel"><p className="eyebrow dark">LEARN VISUALLY</p><h2>Visual studio</h2><p className="muted">Turn a topic into a quick revision map or a step-by-step flowchart.</p><textarea className="visual-input" defaultValue={text ? text.slice(0, 500) : ''} placeholder="Describe a concept, algorithm, or chapter…" /><div className="visual-actions"><button className="button">Create mind map</button><button className="button secondary">Make flowchart</button><button className="button secondary">Formula sheet</button></div></section><section className="panel visual-preview"><div className="map-node main-node">Your concept</div><div className="map-branch"><span>Key idea 1</span><span>Key idea 2</span><span>Example</span></div><small>Visual preview · connect your ideas</small></section></div>; }

function Progress({ questions }: { questions: Question[] }) { return <div className="progress-layout"><section className="panel progress-hero"><p className="eyebrow dark">YOUR MOMENTUM</p><h2>You’re making progress</h2><p className="muted">Consistency beats intensity. Keep showing up.</p><div className="progress-ring"><strong>68%</strong><small>readiness</small></div></section><section className="panel"><p className="eyebrow dark">SKILL BREAKDOWN</p><h3>Topic confidence</h3>{[['Algorithms', 82], ['Mathematics', 64], ['Physics', 48], ['Communication', 71]].map(([name, value]) => <div className="skill" key={name as string}><div><span>{name}</span><strong>{value}%</strong></div><div className="bar"><i style={{ width: `${value}%` }} /></div></div>)}<div className="insight"><strong>✦ Next best action</strong><p>Revise your weakest topic for 20 minutes, then take a short quiz.</p></div></section></div>; }
