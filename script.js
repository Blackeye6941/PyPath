const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const CURRICULUM = [
  { id:'m1', label:'Python Fundamentals', icon:'🐍', tag:'t-blue', desc:'Variables, data types, loops, functions — everything to write Python from scratch.', level:'Beginner',
    chapters:[
      {id:'c1',title:'Introduction & Setup'},{id:'c2',title:'Variables & Data Types'},{id:'c3',title:'Operators & Expressions'},
      {id:'c4',title:'Strings & String Methods'},{id:'c5',title:'Lists, Tuples & Sets'},{id:'c6',title:'Dictionaries'},
      {id:'c7',title:'Control Flow: if/elif/else'},{id:'c8',title:'Loops: for & while'},{id:'c9',title:'Functions'},
      {id:'c10',title:'Modules & Packages'},{id:'c11',title:'File I/O'},{id:'c12',title:'Error Handling'}
    ]},
  { id:'m2', label:'Advanced Python', icon:'⚡', tag:'t-purple', desc:'OOP, decorators, async, type hints, testing — think and code like an expert.', level:'Intermediate',
    chapters:[
      {id:'c13',title:'OOP: Classes & Objects'},{id:'c14',title:'Inheritance & Polymorphism'},
      {id:'c15',title:'Decorators & Closures'},{id:'c16',title:'Generators & Iterators'},
      {id:'c17',title:'Context Managers'},{id:'c18',title:'Concurrency: async/await'},
      {id:'c19',title:'Type Hints & Pydantic'},{id:'c20',title:'Testing with pytest'}
    ]},
  { id:'m3', label:'FastAPI', icon:'🚀', tag:'t-orange', desc:'Build fast, production-ready REST APIs with auth, databases, and deployment.', level:'Intermediate',
    chapters:[
      {id:'c21',title:'FastAPI Introduction'},{id:'c22',title:'Path & Query Params'},
      {id:'c23',title:'Request Body & Schemas'},{id:'c24',title:'Authentication & JWT'},
      {id:'c25',title:'Database with SQLAlchemy'},{id:'c26',title:'Background Tasks & WebSockets'},
      {id:'c27',title:'Testing FastAPI Apps'},{id:'c28',title:'Deploying FastAPI'}
    ]},
  { id:'m4', label:'AI/ML with Python', icon:'🧠', tag:'t-green', desc:'NumPy, Pandas, Scikit-learn, PyTorch, NLP, LLMs, RAG — become an AI/ML pro.', level:'Advanced',
    chapters:[
      {id:'c29',title:'NumPy & Pandas Foundations'},{id:'c30',title:'Data Visualization'},
      {id:'c31',title:'Scikit-learn: ML Basics'},{id:'c32',title:'Supervised Learning'},
      {id:'c33',title:'Unsupervised Learning'},{id:'c34',title:'Feature Engineering'},
      {id:'c35',title:'Deep Learning with PyTorch'},{id:'c36',title:'Neural Networks & CNNs'},
      {id:'c37',title:'NLP & Transformers'},{id:'c38',title:'LLMs & LangChain'},
      {id:'c39',title:'RAG & Vector Databases'},{id:'c40',title:'Building AI Products'}
    ]}
];

let KEY = '', completed = new Set(JSON.parse(localStorage.getItem('pypath_done')||'[]'));
let curMod = null, curCh = null, chatHist = [], practiceHist = [], editor = null, pyodide = null;

function saveApiKey() {
  const input = document.getElementById('api-key-input');
  if (!input) return;
  const k = input.value.trim();
  if (!k.startsWith('gsk_')) { 
    alert('Please enter a valid Groq API key (starts with gsk_)'); 
    return; 
  }
  
  KEY = k; 
  localStorage.setItem('pypath_key', k);
  
  const m = document.getElementById('api-modal');
  if (m) m.style.display = 'none';
  
  init();
}

// Add Enter key support for API modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const modal = document.getElementById('api-modal');
    if (modal && modal.style.display !== 'none') {
      saveApiKey();
    }
  }
});

function init() {
  buildSidebar();
  updateProgress();
  
  const params = new URLSearchParams(window.location.search);
  const modId = params.get('mod');
  const chId = params.get('ch');
  
  const path = window.location.pathname;
  if (path.includes('lesson.html')) {
    if (modId && chId) {
      loadChapter(modId, chId);
    } else {
      showHome();
    }
  } else if (path.includes('practice.html')) {
    initEditor();
    showPractice();
  } else {
    buildHome();
  }
}

function initEditor() {
  const ta = document.getElementById('code-editor');
  if (!ta || editor) return;
  editor = CodeMirror.fromTextArea(ta, {
    mode: 'python',
    theme: 'dracula',
    lineNumbers: true,
    indentUnit: 4,
    autoCloseBrackets: true,
    matchBrackets: true,
    extraKeys: { "Tab": "indentMore", "Shift-Tab": "indentLess" }
  });
}

function buildSidebar() {
  const c = document.getElementById('sidebar-modules');
  if (!c) return;
  c.innerHTML = '';
  CURRICULUM.forEach((mod, mi) => {
    const done = mod.chapters.filter(ch=>completed.has(ch.id)).length;
    const g = document.createElement('div');
    g.className = `module-group m${mi+1}`;
    
    // Auto-open current module or first one
    const params = new URLSearchParams(window.location.search);
    const modId = params.get('mod');
    if (modId === mod.id || (!modId && mi === 0)) g.classList.add('open');
    
    g.innerHTML = `<div class="module-header" onclick="this.parentElement.classList.toggle('open')">
      <div class="module-badge">${mod.icon}</div>
      <span style="flex:1;font-size:11px">${mod.label}</span>
      <span style="font-size:10px;font-family:var(--mono);color:var(--text3)">${done}/${mod.chapters.length}</span>
    </div>
    <div class="module-chapters">${mod.chapters.map(ch=>`
      <div class="chapter-item${completed.has(ch.id)?' completed':''}${params.get('ch')===ch.id?' active':''}" id="ch-${ch.id}" onclick="loadChapter('${mod.id}','${ch.id}')">
        <div class="ch-dot"></div><span style="font-size:12px;line-height:1.3">${ch.title}</span>
      </div>`).join('')}</div>`;
    c.appendChild(g);
  });
}

function buildHome() {
  const grid = document.getElementById('home-modules');
  if (!grid) return;
  grid.innerHTML = CURRICULUM.map((mod,i)=>`
    <div class="module-card mc-${i+1}" onclick="openModule('${mod.id}')">
      <div class="mc-icon">${mod.icon}</div>
      <div class="mc-title">${mod.label}</div>
      <div class="mc-desc">${mod.desc}</div>
      <div class="mc-meta">${mod.chapters.length} chapters · ${mod.chapters.filter(c=>completed.has(c.id)).length} done</div>
      <div class="mc-tag ${mod.tag}">${mod.level}</div>
    </div>`).join('');
}

function updateProgress() {
  const total = CURRICULUM.reduce((s,m)=>s+m.chapters.length,0), done = completed.size;
  const pct = Math.round((done/total)*100);
  const fill = document.getElementById('prog-fill');
  if (fill) fill.style.width = pct+'%';
  const statDone = document.getElementById('prog-done');
  if (statDone) statDone.textContent = done+' chapters';
  const statPct = document.getElementById('prog-pct');
  if (statPct) statPct.textContent = pct+'%';
}

function showHome() { window.location.href = 'index.html'; }
function showPractice() {
  if (!window.location.pathname.includes('practice.html')) {
    window.location.href = 'practice.html';
    return;
  }
  document.getElementById('tb-module').textContent = 'Practice Area';
  document.getElementById('tb-chapter').textContent = 'Free Coding';
}

function openModule(id) {
  const m = CURRICULUM.find(x=>x.id===id);
  loadChapter(id, m.chapters[0].id);
}

async function loadChapter(modId, chId) {
  if (!window.location.pathname.includes('lesson.html')) {
    window.location.href = `lesson.html?mod=${modId}&ch=${chId}`;
    return;
  }
  
  const mod = CURRICULUM.find(m=>m.id===modId), ch = mod.chapters.find(c=>c.id===chId);
  curMod=mod; curCh=ch;
  
  document.querySelectorAll('.chapter-item').forEach(el=>el.classList.remove('active'));
  const chEl = document.getElementById('ch-'+chId);
  if (chEl) chEl.classList.add('active');
  
  document.getElementById('tb-module').textContent = mod.label;
  document.getElementById('tb-chapter').textContent = ch.title;
  
  chatHist = [];
  document.getElementById('ai-messages').innerHTML = `<div class="msg ai"><div class="msg-avatar">P</div><div class="msg-bubble">Loading <strong>${ch.title}</strong>... Ask me anything once it's ready! 🐍</div></div>`;
  document.getElementById('lesson-body').innerHTML = `<div style="display:flex;align-items:center;gap:12px;padding:40px 0;color:var(--text3)"><div class="loading-spinner"></div> Generating lesson with AI...</div>`;
  
  const html = await llmLesson(mod.label, ch.title);
  document.getElementById('lesson-body').innerHTML = html;
  
  if (!completed.has(chId)) {
    const nxt = getNext(modId,chId);
    document.getElementById('lesson-body').innerHTML += `<div class="chapter-complete">
      <div class="cc-emoji2">🎉</div>
      <div class="cc-title2">Chapter Complete!</div>
      <div class="cc-sub2">Great work on <strong>${ch.title}</strong>.</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:14px">
        <button class="btn btn-green" onclick="markDone('${modId}','${chId}')">✓ Mark Complete</button>
        ${nxt?`<button class="btn btn-primary" onclick="loadChapter('${nxt.mid}','${nxt.cid}')">Next →</button>`:''}
        <button class="btn" onclick="showPractice()">⚡ Practice</button>
      </div></div>`;
  }
}

function getNext(modId,chId) {
  const mi=CURRICULUM.findIndex(m=>m.id===modId), mod=CURRICULUM[mi];
  const ci=mod.chapters.findIndex(c=>c.id===chId);
  if (ci<mod.chapters.length-1) return {mid:modId,cid:mod.chapters[ci+1].id};
  if (mi<CURRICULUM.length-1) { const nm=CURRICULUM[mi+1]; return {mid:nm.id,cid:nm.chapters[0].id}; }
  return null;
}

function markDone(modId,chId) {
  completed.add(chId); localStorage.setItem('pypath_done',JSON.stringify([...completed]));
  const chEl = document.getElementById('ch-'+chId);
  if (chEl) chEl.classList.add('completed');
  updateProgress(); buildSidebar();
}

async function llmLesson(modName, chTitle) {
  const p = `You are an expert Python tutor. Write a thorough, engaging HTML lesson for:
Module: ${modName} | Chapter: ${chTitle}

Return ONLY HTML content (no doctype/html/head/body tags). Use:
- <h1> for title, <h2> for sections, <h3> for subsections, <p> for text
- Code blocks: <div class="code-block"><div class="code-block-header"><span>python</span></div><pre>CODE</pre></div>
- Syntax highlighting spans: <span class="kw">def</span> <span class="fn">func</span> <span class="str">"str"</span> <span class="num">42</span> <span class="cm"># comment</span>
- Concept cards: <div class="concept-cards"><div class="concept-card"><div class="cc-icon">EMOJI</div><div class="cc-title">Title</div><div class="cc-desc">Desc</div></div>...</div>
- Inline code: <code>text</code>
- Practice section: <h2>Practice Questions</h2> followed by two coding tasks. For each, include a description and <strong>Expected Output:</strong> <code>...</code>.
- Quiz at end: <div class="quiz-box"><div class="quiz-q">Question?</div><div class="quiz-options"><button class="quiz-opt" onclick="checkQ(this,false)">Wrong</button><button class="quiz-opt" onclick="checkQ(this,true)">Correct</button></div><div class="quiz-feedback"></div></div>

Include: intro, 2-4 concept cards, 3+ sections with code examples, real-world example, 2 practice questions with expected outputs, quiz. Wrap all in <div class="lesson-content">.`;
  
  try {
    const r = await fetch(API_URL, { 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KEY}`
      }, 
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: p }],
        temperature: 0.7,
        max_tokens: 4096
      }) 
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    return d.choices[0].message.content.replace(/```html\n?/g, '').replace(/```\n?/g, '');
  } catch (e) { 
    return `<div class="lesson-content"><h1>${chTitle}</h1><p style="color:var(--orange)">Error: ${e.message}</p></div>`; 
  }
}

window.checkQ = (btn, correct) => {
  const box = btn.closest('.quiz-box'); 
  box.querySelectorAll('.quiz-opt').forEach(b => b.disabled = true);
  const fb = box.querySelector('.quiz-feedback');
  if (correct) { 
    btn.classList.add('correct'); 
    fb.className = 'quiz-feedback show good'; 
    fb.textContent = '✓ Correct! Great job!'; 
  } else { 
    btn.classList.add('wrong'); 
    box.querySelectorAll('.quiz-opt').forEach(b => {
      try { if (b.onclick.toString().includes('true')) b.classList.add('correct'); } catch {}
    }); 
    fb.className = 'quiz-feedback show bad'; 
    fb.textContent = '✗ Not quite — see the highlighted answer.'; 
  }
};

function setAiTab(el, tab) {
  document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active')); 
  el.classList.add('active');
  if (tab === 'quiz') generateQuiz(); 
  else if (tab === 'hints') addHints();
}

async function sendMessage() {
  const inp = document.getElementById('ai-input'), txt = inp.value.trim(); 
  if (!txt) return;
  inp.value = ''; 
  addMsg('user', txt, 'ai-messages', 'Y'); 
  chatHist.push({ role: 'user', content: txt });
  
  const t = addTyping('ai-messages');
  const sys = (curCh ? `Student is learning: ${curMod.label} > ${curCh.title}. ` : '') + 'You are PyMentor, a friendly Python/AI tutor. Be clear, helpful, concise.';
  
  const resp = await llmChat(sys, chatHist); 
  t.remove();
  
  chatHist.push({ role: 'assistant', content: resp }); 
  addMsg('ai', resp, 'ai-messages', 'P');
}

async function sendPracticeMessage() {
  const inp = document.getElementById('practice-input'), txt = inp.value.trim(); 
  if (!txt) return;
  const code = editor ? editor.getValue() : document.getElementById('code-editor').value;
  inp.value = ''; 
  addMsg('user', txt, 'practice-messages', 'Y');
  const msgContent = `Code:\n\`\`\`python\n${code}\n\`\`\`\n\nQuestion: ${txt}`;
  practiceHist.push({ role: 'user', content: msgContent });
  
  const t = addTyping('practice-messages');
  const resp = await llmChat('You are a Python coding assistant. Be helpful, concise, educational.', practiceHist); 
  t.remove();
  
  practiceHist.push({ role: 'assistant', content: resp }); 
  addMsg('ai', resp, 'practice-messages', 'P');
}

async function llmChat(sys, hist, responseType = "text") {
  if (hist.length > 10) hist = hist.slice(-10);
  try {
    const bodyData = {
      model: MODEL,
      messages: [{ role: "system", content: sys }, ...hist],
      temperature: responseType === "json" ? 0.1 : 0.7,
      max_tokens: 1024
    };
    if (responseType === "json") bodyData.response_format = { type: "json_object" };
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
      body: JSON.stringify(bodyData)
    });
    const d = await r.json(); 
    if (d.error) return 'Error: ' + d.error.message;
    return d.choices[0].message.content;
  } catch (e) { return 'Error: ' + e.message; }
}

async function generateQuiz() {
  if (!curCh) { addMsg('ai', 'Load a chapter first!', 'ai-messages', 'P'); return; }
  const t = addTyping('ai-messages');
  const p = `Generate a quiz question about "${curCh.title}" in Python. Return ONLY valid JSON matching this schema: {"question":"...","options":["...","...","...","..."],"correct":INDEX}`;
  const resp = await llmChat('You are a Python quiz generator outputting strict structured data.', [{ role: 'user', content: p }], "json"); 
  t.remove();
  try {
    const q = JSON.parse(resp.replace(/```json\n?|```\n?/g, '').trim());
    const div = document.createElement('div'); 
    div.className = 'msg ai';
    div.innerHTML = `<div class="msg-avatar">P</div><div class="msg-bubble"><strong>Quick Quiz!</strong><br><br>${q.question}<br><br>
    ${q.options.map((o, i) => `<button class="quiz-opt" style="display:block;width:100%;text-align:left;margin-bottom:5px" onclick="checkQMsg(this,${i === q.correct})">${String.fromCharCode(65 + i)}. ${o}</button>`).join('')}
    <div class="quiz-feedback"></div></div>`;
    document.getElementById('ai-messages').appendChild(div);
    document.getElementById('ai-messages').scrollTop = 99999;
  } catch { addMsg('ai', resp, 'ai-messages', 'P'); }
}

window.checkQMsg = (btn, correct) => {
  const bbl = btn.closest('.msg-bubble'); 
  bbl.querySelectorAll('.quiz-opt').forEach(b => b.disabled = true);
  const fb = bbl.querySelector('.quiz-feedback');
  if (correct) {
    btn.style.cssText = 'display:block;width:100%;text-align:left;margin-bottom:5px;background:rgba(63,185,80,0.1);border-color:var(--green);color:var(--green)';
    fb.className = 'quiz-feedback show good'; fb.textContent = '✓ Correct!';
  } else {
    btn.style.cssText = 'display:block;width:100%;text-align:left;margin-bottom:5px;background:rgba(247,129,102,0.1);border-color:var(--orange);color:var(--orange)';
    fb.className = 'quiz-feedback show bad'; fb.textContent = '✗ Incorrect. Keep studying!';
  }
};

async function addHints() {
  if (!curCh) { addMsg('ai', 'Load a chapter first!', 'ai-messages', 'P'); return; }
  const t = addTyping('ai-messages');
  const resp = await llmChat('You are PyMentor.', [{ role: 'user', content: `Give 3 practical tips and common pitfalls for "${curCh.title}" in Python. Be concise.` }]);
  t.remove(); 
  addMsg('ai', '💡 Tips for ' + curCh.title + ':\n\n' + resp, 'ai-messages', 'P');
}

async function getChallenge() {
  const ctx = curCh ? `${curMod.label} > ${curCh.title}` : 'General Python';
  const t = addTyping('practice-messages');
  const resp = await llmChat('You are a coding challenge generator.', [{ role: 'user', content: `Create a Python coding challenge for: ${ctx}. Include problem statement, example, and starter code template.` }]);
  t.remove(); 
  addMsg('ai', resp, 'practice-messages', 'P');
  const starter = '# Challenge — see the description on the right\n# Write your solution below:\n\n';
  if (editor) editor.setValue(starter);
  else document.getElementById('code-editor').value = starter;
}

async function aiReviewCode() {
  const code = (editor ? editor.getValue() : document.getElementById('code-editor').value).trim();
  if (!code) { addMsg('ai', 'Write some code first!', 'practice-messages', 'P'); return; }
  const t = addTyping('practice-messages');
  const resp = await llmChat('You are a supportive, expert Python tutor.', [{ role: 'user', content: `Review this code like a real tutor would in under 100 words:\n\`\`\`python\n${code}\n\`\`\`\nSpeak naturally, avoid bullet points, and focus on the most important feedback. Keep it around 100 words.` }]);
  t.remove(); 
  addMsg('ai', resp, 'practice-messages', 'P');
}
function toggleOutput() {
  const el = document.getElementById('output-area');
  if (el) el.classList.toggle('collapsed');
}

async function runCode() {
  const code = editor ? editor.getValue() : document.getElementById('code-editor').value;
  const outEl = document.getElementById('output-text'), dot = document.getElementById('out-dot'), area = document.getElementById('output-area');

  if (area) area.classList.remove('collapsed'); // Open on run

  if (!pyodide) {
...
    outEl.textContent = '🚀 Loading Python Engine (Pyodide)...';
    outEl.style.color = 'var(--accent)';
    try {
      pyodide = await loadPyodide();
      outEl.textContent = '✅ Python Engine Ready!\n';
    } catch (err) {
      outEl.textContent = '❌ Failed to load Pyodide: ' + err.message;
      outEl.style.color = 'var(--orange)';
      return;
    }
  }

  outEl.textContent = 'Running...';
  outEl.style.color = 'var(--text)';
  let output = '';

  try {
    // Redirect stdout to capture print statements
    pyodide.setStdout({ batched: (str) => { output += str + '\n'; } });
    pyodide.setStderr({ batched: (str) => { output += str + '\n'; } });

    await pyodide.runPythonAsync(code);
    
    outEl.textContent = output || '(no output)';
    outEl.style.color = 'var(--green)';
    dot.style.background = 'var(--green)';
  } catch (e) {
    outEl.style.color = 'var(--orange)';
    dot.style.background = 'var(--orange)';
    outEl.textContent = output + '\n❌ Python Error:\n' + e.message;
  }
}

function addMsg(role, text, containerId, letter) {
  const c = document.getElementById(containerId), d = document.createElement('div');
  d.className = 'msg ' + role;
  const fmt = text.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  d.innerHTML = `<div class="msg-avatar">${letter}</div><div class="msg-bubble">${fmt}</div>`;
  c.appendChild(d); c.scrollTop = 99999; return d;
}

function addTyping(cid) {
  const c = document.getElementById(cid), d = document.createElement('div');
  d.className = 'msg ai';
  d.innerHTML = `<div class="msg-avatar">P</div><div class="msg-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  c.appendChild(d); c.scrollTop = 99999; return d;
}

window.onload = () => {
  const saved = localStorage.getItem('pypath_key');
  const m = document.getElementById('api-modal');
  if (saved) {
    KEY = saved;
    if (m) m.style.display = 'none';
  } else {
    if (m) m.style.display = 'flex';
  }
  init();

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration failed:', err));
    });
  }
};
