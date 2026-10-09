/* ============================================================
   HomeworkLens v3 — Class group chaos → clean checklist
   + AI answer grading + live model picker + API key check
   Built for EvoHacks 2026 (AI for Automation)
   AI-native build: designed & directed by a 15-year-old builder,
   code generated with AI tooling and verified end-to-end.
   ============================================================ */

'use strict';

/* ---------- state ---------- */
const state = {
  mode: 'screenshot',          // 'screenshot' | 'text' | 'grade'
  images: [],                  // [{name, type, base64, dataUrl}]
  lastResult: null,            // parsed checklist output
  lastGrade: null,             // parsed grading output
  lastSource: 'screenshot',
  loadingTimer: null,
  confettiFired: false,
};

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);

function saveSettings(s) { localStorage.setItem('hl_settings', JSON.stringify(s)); }
function getSettings() {
  try {
    return Object.assign(
      { apiKey: '', lang: 'english', model: 'gemini-2.5-flash' },
      JSON.parse(localStorage.getItem('hl_settings') || '{}')
    );
  } catch (e) { return { apiKey: '', lang: 'english', model: 'gemini-2.5-flash' }; }
}

function toast(msg, isError) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3200);
}

function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }

function isoOffset(days) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function nextWeekday(wd) { // wd: 0=Sun ... 6=Sat
  const d = new Date();
  let diff = (wd - d.getDay() + 7) % 7; if (diff === 0) diff = 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
function daysUntil(iso) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso + 'T00:00:00') - today) / 86400000);
}

function outLanguage(lang) {
  return lang === 'hindi' ? 'Hindi (Devanagari script)'
    : lang === 'hinglish' ? 'Hinglish (Hindi written in Roman script)'
    : 'English';
}

/* ---------- subject colors ---------- */
const SUBJECT_COLORS = [
  ['#ffd8a8', '#7a4109'], ['#ffc9c9', '#8a1f1f'], ['#b2f2bb', '#1d5a2a'],
  ['#a5d8ff', '#114a7a'], ['#d0bfff', '#4a248a'], ['#ffec99', '#6b5900'],
  ['#99e9f2', '#0b5a63'], ['#fcc2d7', '#832147']
];
function subjectColor(name) {
  const s = (name || 'general').toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const pair = SUBJECT_COLORS[Math.abs(h) % SUBJECT_COLORS.length];
  return { bg: pair[0], fg: pair[1] };
}

/* ---------- checkbox persistence ---------- */
function hashKey(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return 'k' + (h >>> 0);
}
function getDone() { try { return JSON.parse(localStorage.getItem('hl_done') || '{}'); } catch (e) { return {}; } }
function setDone(k, v) {
  const d = getDone();
  if (v) d[k] = 1; else delete d[k];
  localStorage.setItem('hl_done', JSON.stringify(d));
}

/* ---------- confetti ---------- */
function fireConfetti() {
  const colors = ['#ff7a1a', '#ffd166', '#2ecc71', '#5ab8ff', '#ff5d5d', '#d0bfff'];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('div');
    p.className = 'confetti';
    p.style.left = (Math.random() * 100) + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = (Math.random() * 0.5) + 's';
    p.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 3400);
  }
  toast('All tasks done — great work!');
}

/* ---------- tabs ---------- */
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    state.mode = tab.dataset.mode;
    if (state.mode === 'screenshot') {
      show('dropZone'); show('previews'); hide('textZone'); hide('gradeZone');
      show('scanBtn'); show('demoBtn'); hide('gradeBtn');
    } else if (state.mode === 'text') {
      hide('dropZone'); hide('previews'); show('textZone'); hide('gradeZone');
      show('scanBtn'); show('demoBtn'); hide('gradeBtn');
      $('chatText').focus();
    } else {
      hide('dropZone'); hide('previews'); hide('textZone'); show('gradeZone');
      hide('scanBtn'); hide('demoBtn'); show('gradeBtn');
      $('gradeQuestion').focus();
    }
  });
});

/* ---------- file handling ---------- */
const dropZone = $('dropZone');
const fileInput = $('fileInput');

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });

['dragover', 'dragenter'].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); }));
dropZone.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

document.addEventListener('paste', (e) => {
  if ($('settingsModal') && !$('settingsModal').classList.contains('hidden')) return;
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  const files = [];
  for (const it of items) if (it.type.startsWith('image/')) files.push(it.getAsFile());
  if (files.length) { addFiles(files); toast('Screenshot pasted'); }
});

function addFiles(fileList) {
  for (const f of fileList) {
    if (!f.type.startsWith('image/')) continue;
    if (state.images.length >= 6) { toast('Max 6 screenshots per scan', true); break; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      state.images.push({
        name: f.name, type: f.type,
        base64: dataUrl.split(',')[1], dataUrl
      });
      renderPreviews();
    };
    reader.readAsDataURL(f);
  }
}

function renderPreviews() {
  const wrap = $('previews');
  wrap.innerHTML = '';
  state.images.forEach((img, i) => {
    const div = document.createElement('div');
    div.className = 'preview-item';
    const im = document.createElement('img');
    im.src = img.dataUrl;
    const btn = document.createElement('button');
    btn.className = 'preview-remove';
    btn.textContent = 'x';
    btn.onclick = () => { state.images.splice(i, 1); renderPreviews(); };
    div.appendChild(im); div.appendChild(btn);
    wrap.appendChild(div);
  });
}

/* ---------- demo data ---------- */
const DEMO_RESULT = {
  homework: [
    { subject: 'Mathematics', task: 'Prepare for chapter 7 test — focus on Exercise 7.1 and 7.2', deadline_raw: 'tomorrow', deadline_date: isoOffset(1), priority: 'high' },
    { subject: 'English', task: 'Write essay "My Role Model" — 250 words, submit it', deadline_raw: 'Friday', deadline_date: nextWeekday(5), priority: 'high' },
    { subject: 'Chemistry', task: 'Complete worksheet page 34', deadline_raw: null, deadline_date: null, priority: 'medium' }
  ],
  exams: [
    { subject: 'Mathematics', date_raw: 'tomorrow', date: isoOffset(1), details: 'Chapter 7 test — 20 marks' }
  ],
  materials: [
    { item: 'Science practical file', for_when: isoOffset(1) }
  ],
  announcements: [
    { text: 'Parent-Teacher Meeting (PTM) on Saturday at 10:00 AM — inform your parents.' }
  ],
  ignored_count: 7
};

/* ---------- loading messages ---------- */
const LOADING_MSGS = [
  'Reading the chat…',
  'Skipping "good morning" forwards…',
  'Finding deadlines…',
  'Separating memes from homework…',
  'Talking to Gemini AI…',
  'Building your checklist…'
];

function startLoading(custom) {
  show('loadingSection');
  let i = 0;
  $('loadingMsg').textContent = custom || LOADING_MSGS[0];
  if (custom) return;
  state.loadingTimer = setInterval(() => {
    i = (i + 1) % LOADING_MSGS.length;
    $('loadingMsg').textContent = LOADING_MSGS[i];
  }, 1600);
}
function stopLoading() {
  hide('loadingSection');
  clearInterval(state.loadingTimer);
}

/* ---------- AI prompts ---------- */
function buildPrompt(lang) {
  return `You are HomeworkLens, an expert reader of school/college class group chats (WhatsApp, Telegram etc.).
Read the provided class group content (images are chat screenshots, text is copied chat).

Extract ONLY academic action items. Ignore greetings, memes, jokes, small talk, thanks, and anything not actionable for a student.

Rules:
- homework: tasks a student must do (exercises, essays, worksheets, reading, preparation).
- exams: announced tests/exams with date details if given.
- materials: physical things to bring (files, books, instruments, money, forms).
- announcements: important notices (PTM, holidays, events) — max 3.
- deadline_date / date / for_when: convert relative words (tomorrow, day after tomorrow, weekday names, etc.) into ISO dates (YYYY-MM-DD) using today = ${new Date().toISOString().slice(0, 10)}. Use null if no date is mentioned or unclear.
- priority: "high" (test tomorrow / strict deadline), "medium" (this week), "low" (no deadline).
- ignored_count: approximate number of messages you ignored as irrelevant.
- Write all task/text strings in ${outLanguage(lang)}. Keep subject names recognisable.

Return ONLY valid JSON, no markdown, exactly this shape:
{
  "homework": [{"subject": "...", "task": "...", "deadline_raw": "...", "deadline_date": "YYYY-MM-DD or null", "priority": "high|medium|low"}],
  "exams": [{"subject": "...", "date_raw": "...", "date": "YYYY-MM-DD or null", "details": "..."}],
  "materials": [{"item": "...", "for_when": "YYYY-MM-DD or null"}],
  "announcements": [{"text": "..."}],
  "ignored_count": 0
}`;
}

function buildGradePrompt(question, answer, max, lang) {
  return `You are a strict but fair school examiner. Grade the student's answer for the given question.

Question: """${question}"""
Maximum marks: ${max}
Student's answer: """${answer}"""

Grade strictly and fairly, like a real examiner:
- Award marks only for correct, relevant content.
- score must be a number between 0 and ${max} (half marks allowed).
- verdict: one or two lines of overall feedback.
- strengths: 1-4 short points the student did well.
- missing_points: 1-4 short points that were missing or wrong (empty array if answer is perfect).
- improvement: one actionable tip to score higher next time.
- Write all feedback text in ${outLanguage(lang)}.

Return ONLY valid JSON, no markdown, exactly this shape:
{"score": 0, "max_score": ${max}, "verdict": "...", "strengths": ["..."], "missing_points": ["..."], "improvement": "..."}`;
}

/* ---------- Gemini call ---------- */
async function callGemini(settings, parts) {
  const model = (settings.model || 'gemini-2.5-flash').trim();
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(settings.apiKey);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
    })
  });

  if (!res.ok) {
    let msg = 'API error ' + res.status;
    try {
      const err = await res.json();
      msg = (err.error && err.error.message) || msg;
    } catch (e) { /* ignore */ }
    if (res.status === 400 && /API key/i.test(msg)) msg = 'Invalid Gemini API key — check Settings';
    if (res.status === 404) msg = 'Model not found — pick another model in Settings';
    if (res.status === 429) msg = 'Free limit reached for now — wait a minute and retry';
    throw new Error(msg);
  }

  const data = await res.json();
  const cand = data.candidates && data.candidates[0];
  if (!cand || !cand.content) throw new Error('AI returned an empty answer — try again');
  const text = cand.content.parts.map((p) => p.text || '').join('');
  return parseJsonSafe(text);
}

function parseJsonSafe(text) {
  try { return JSON.parse(text); } catch (e) { /* fallthrough */ }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (e) { /* fallthrough */ }
  }
  throw new Error('Could not read the AI response — try again');
}

/* ---------- checklist scan ---------- */
async function scan(isDemo) {
  const settings = getSettings();

  if (isDemo) {
    state.lastSource = 'demo';
    startLoading();
    await sleep(1800);
    stopLoading();
    renderResult(JSON.parse(JSON.stringify(DEMO_RESULT)));
    saveHistory(DEMO_RESULT, 'demo');
    return;
  }

  if (!settings.apiKey) {
    toast('Add your free Gemini API key first — open Settings', true);
    openSettings();
    return;
  }

  const parts = [{ text: buildPrompt(settings.lang) }];

  if (state.mode === 'screenshot') {
    if (!state.images.length) { toast('Add at least one screenshot first', true); return; }
    for (const img of state.images) {
      parts.push({ inline_data: { mime_type: img.type, data: img.base64 } });
    }
    state.lastSource = 'screenshot';
  } else {
    const txt = $('chatText').value.trim();
    if (!txt) { toast('Paste the chat text first', true); return; }
    parts.push({ text: 'Class group chat:\n\n' + txt });
    state.lastSource = 'text';
  }

  startLoading();
  $('scanBtn').disabled = true;
  try {
    const result = normalize(await callGemini(settings, parts));
    stopLoading();
    renderResult(result);
    saveHistory(result, state.lastSource);
  } catch (err) {
    stopLoading();
    toast(err.message || 'Something went wrong', true);
  } finally {
    $('scanBtn').disabled = false;
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function normalize(r) {
  return {
    homework: Array.isArray(r.homework) ? r.homework : [],
    exams: Array.isArray(r.exams) ? r.exams : [],
    materials: Array.isArray(r.materials) ? r.materials : [],
    announcements: Array.isArray(r.announcements) ? r.announcements : [],
    ignored_count: Number(r.ignored_count) || 0
  };
}

/* ---------- grading scan ---------- */
async function gradeScan() {
  const settings = getSettings();
  if (!settings.apiKey) {
    toast('Add your free Gemini API key first — open Settings', true);
    openSettings();
    return;
  }
  const q = $('gradeQuestion').value.trim();
  const a = $('gradeAnswer').value.trim();
  const max = Math.max(1, Math.min(100, parseInt($('gradeMax').value, 10) || 10));
  if (!q || !a) { toast('Enter both the question and your answer first', true); return; }

  startLoading('Grading like an examiner…');
  $('gradeBtn').disabled = true;
  try {
    const g = normalizeGrade(await callGemini(settings, [{ text: buildGradePrompt(q, a, max, settings.lang) }]));
    stopLoading();
    renderGrade(g);
  } catch (err) {
    stopLoading();
    toast(err.message || 'Something went wrong', true);
  } finally {
    $('gradeBtn').disabled = false;
  }
}

function normalizeGrade(g) {
  const max = Number(g.max_score) || 10;
  return {
    score: Math.max(0, Math.min(max, Number(g.score) || 0)),
    max_score: max,
    verdict: String(g.verdict || ''),
    strengths: Array.isArray(g.strengths) ? g.strengths : [],
    missing_points: Array.isArray(g.missing_points) ? g.missing_points : [],
    improvement: String(g.improvement || '')
  };
}

function renderGrade(g) {
  state.lastResult = null;
  state.lastGrade = g;
  hide('inputSection'); hide('historySection');
  show('resultSection');
  $('focusStrip').classList.add('hidden');
  $('resultTitle').textContent = 'Your grade report';

  const pct = Math.round((g.score / g.max_score) * 100);
  const cls = pct >= 75 ? 'good' : pct >= 45 ? 'mid' : 'bad';

  $('statsRow').innerHTML = `
    <div class="stat-card"><div class="stat-num score-${cls}">${g.score} / ${g.max_score}</div><div class="stat-label">Marks awarded</div></div>
    <div class="stat-card"><div class="stat-num score-${cls}">${pct}%</div><div class="stat-label">Percentage</div></div>
    <div class="stat-card"><div class="stat-num">${g.strengths.length}</div><div class="stat-label">Strengths</div></div>
    <div class="stat-card"><div class="stat-num">${g.missing_points.length}</div><div class="stat-label">Gaps found</div></div>`;

  const wrap = $('resultContent');
  wrap.innerHTML = '';

  const verdictBox = document.createElement('div');
  verdictBox.className = 'verdict-box ' + cls;
  verdictBox.textContent = g.verdict || 'No verdict returned.';
  wrap.appendChild(verdictBox);

  if (g.strengths.length) wrap.appendChild(listGroup('Strengths', g.strengths, 'Good', ''));
  if (g.missing_points.length) wrap.appendChild(listGroup('Missing or incorrect', g.missing_points, 'Gap', 'exam'));
  if (g.improvement) {
    const tip = document.createElement('div');
    tip.className = 'improvement-box';
    tip.innerHTML = '<div class="group-title">How to score higher</div>';
    const p = document.createElement('div');
    p.className = 'empty-group';
    p.textContent = g.improvement;
    tip.appendChild(p);
    wrap.appendChild(tip);
  }

  $('ignoredNote').textContent = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function listGroup(title, lines, chipLabel, chipCls) {
  const div = document.createElement('div');
  div.className = 'result-group';
  const h = document.createElement('div');
  h.className = 'group-title';
  h.textContent = title;
  div.appendChild(h);
  lines.forEach((line) => {
    const row = document.createElement('div');
    row.className = 'item';
    const body = document.createElement('div');
    body.className = 'item-body';
    const top = document.createElement('div');
    top.className = 'item-top';
    const chip = document.createElement('span');
    chip.className = 'chip ' + chipCls;
    chip.textContent = chipLabel;
    top.appendChild(chip);
    const txt = document.createElement('div');
    txt.className = 'item-text';
    txt.textContent = line;
    body.appendChild(top); body.appendChild(txt);
    row.appendChild(body);
    div.appendChild(row);
  });
  return div;
}

/* ---------- relative date labels ---------- */
function relativeLabel(isoDate) {
  if (!isoDate) return null;
  const diff = daysUntil(isoDate);
  const lang = getSettings().lang;
  const hi = lang === 'hindi' || lang === 'hinglish';
  if (diff < 0) return { text: hi ? 'Late ho gaya' : 'Overdue', cls: 'urgent' };
  if (diff === 0) return { text: hi ? 'AAJ — Today' : 'Today', cls: 'urgent' };
  if (diff === 1) return { text: hi ? 'Kal — Tomorrow' : 'Tomorrow', cls: 'soon' };
  if (diff <= 3) return { text: hi ? `${diff} din me` : `In ${diff} days`, cls: 'soon' };
  return { text: hi ? `${diff} din baad` : `In ${diff} days`, cls: '' };
}

/* ---------- checklist rendering ---------- */
function sortHomework(list) {
  const prio = { high: 0, medium: 1, low: 2 };
  return [...list].sort((a, b) => {
    const p = (prio[a.priority] ?? 1) - (prio[b.priority] ?? 1);
    if (p !== 0) return p;
    return (a.deadline_date || '9999').localeCompare(b.deadline_date || '9999');
  });
}

function renderResult(r) {
  state.lastResult = r;
  state.lastGrade = null;
  state.confettiFired = false;
  hide('inputSection'); hide('historySection');
  show('resultSection');
  $('resultTitle').textContent = 'Your clean checklist';

  renderFocus(r);

  $('statsRow').innerHTML = `
    <div class="stat-card stat-homework"><div class="stat-num">${r.homework.length}</div><div class="stat-label">Homework</div></div>
    <div class="stat-card stat-exams"><div class="stat-num">${r.exams.length}</div><div class="stat-label">Exams</div></div>
    <div class="stat-card stat-materials"><div class="stat-num">${r.materials.length}</div><div class="stat-label">To bring</div></div>
    <div class="stat-card stat-ignored"><div class="stat-num">${r.ignored_count}</div><div class="stat-label">Messages filtered</div></div>`;

  const wrap = $('resultContent');
  wrap.innerHTML = '';
  const hw = sortHomework(r.homework);

  wrap.appendChild(group('Homework', hw.length ? hw.map((h) => ({
    chip: h.subject || 'General', chipCls: '', color: subjectColor(h.subject),
    badge: relativeLabel(h.deadline_date) || (h.deadline_raw ? { text: 'Due: ' + h.deadline_raw, cls: '' } : null),
    text: h.task + (h.priority === 'high' ? ' <span class="chip exam">IMPORTANT</span>' : '')
  })) : null, 'No homework found — enjoy!'));

  wrap.appendChild(group('Exams', r.exams.length ? r.exams.map((e) => ({
    chip: e.subject || 'Exam', chipCls: 'exam', color: subjectColor(e.subject),
    badge: relativeLabel(e.date) || (e.date_raw ? { text: 'Due: ' + e.date_raw, cls: 'urgent' } : { text: 'Upcoming', cls: 'soon' }),
    text: e.details || e.subject
  })) : null, 'No exams announced.'));

  wrap.appendChild(group('Bring these', r.materials.length ? r.materials.map((m) => ({
    chip: 'Item', chipCls: 'material', color: null,
    badge: relativeLabel(m.for_when),
    text: m.item
  })) : null, 'Nothing to bring.'));

  wrap.appendChild(group('Announcements', r.announcements.length ? r.announcements.map((a) => ({
    chip: 'Notice', chipCls: 'info', color: null, badge: null, text: a.text
  })) : null, 'No important notices.'));

  $('ignoredNote').textContent = r.ignored_count
    ? `AI filtered ~${r.ignored_count} irrelevant messages (memes, greetings, small talk) — you only see what matters.`
    : '';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderFocus(r) {
  const strip = $('focusStrip');
  strip.innerHTML = '';
  const today = isoOffset(0), tomorrow = isoOffset(1);
  const urgent = r.homework.filter((h) => h.deadline_date === today || h.deadline_date === tomorrow);
  const nextExam = r.exams.filter((e) => e.date && daysUntil(e.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  if (!urgent.length && !nextExam) { strip.classList.add('hidden'); return; }
  strip.classList.remove('hidden');

  const title = document.createElement('div');
  title.className = 'focus-title';
  title.textContent = 'Needs your attention now';
  strip.appendChild(title);

  const row = document.createElement('div');
  row.className = 'focus-row';

  urgent.forEach((h) => {
    const card = document.createElement('div');
    const isToday = h.deadline_date === today;
    card.className = 'focus-card ' + (isToday ? 'today' : 'tomorrow');
    card.innerHTML = `<span class="focus-when">${isToday ? 'DUE TODAY' : 'DUE TOMORROW'}</span>
      <span class="focus-subj"></span><span class="focus-task"></span>`;
    card.querySelector('.focus-subj').textContent = h.subject || 'General';
    card.querySelector('.focus-task').textContent = h.task;
    row.appendChild(card);
  });

  if (nextExam) {
    const d = daysUntil(nextExam.date);
    const card = document.createElement('div');
    card.className = 'focus-card exam';
    card.innerHTML = `<span class="focus-when">NEXT EXAM</span>
      <span class="focus-big"></span><span class="focus-task"></span>`;
    card.querySelector('.focus-big').textContent = d === 0 ? 'TODAY' : d === 1 ? 'TOMORROW' : d + ' days';
    card.querySelector('.focus-task').textContent = nextExam.subject + (nextExam.details ? ' — ' + nextExam.details : '');
    row.appendChild(card);
  }
  strip.appendChild(row);
}

function group(title, items, emptyMsg) {
  const div = document.createElement('div');
  div.className = 'result-group';
  const h = document.createElement('div');
  h.className = 'group-title';
  h.textContent = title;
  div.appendChild(h);

  if (!items) {
    const p = document.createElement('div');
    p.className = 'empty-group';
    p.textContent = emptyMsg;
    div.appendChild(p);
    return div;
  }

  items.forEach((it) => {
    const row = document.createElement('div');
    row.className = 'item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    const key = hashKey(it.text + '|' + (it.chip || ''));
    cb.checked = !!getDone()[key];
    if (cb.checked) row.classList.add('done');
    cb.onchange = () => {
      row.classList.toggle('done', cb.checked);
      setDone(key, cb.checked);
      checkAllDone();
    };
    const body = document.createElement('div');
    body.className = 'item-body';
    const top = document.createElement('div');
    top.className = 'item-top';
    const chip = document.createElement('span');
    chip.className = 'chip ' + (it.chipCls || '');
    if (it.color) { chip.style.background = it.color.bg; chip.style.color = it.color.fg; }
    chip.textContent = it.chip;
    top.appendChild(chip);
    if (it.badge) {
      const b = document.createElement('span');
      b.className = 'deadline-badge ' + (it.badge.cls || '');
      b.textContent = it.badge.text;
      top.appendChild(b);
    }
    const txt = document.createElement('div');
    txt.className = 'item-text';
    txt.innerHTML = it.text;
    body.appendChild(top); body.appendChild(txt);
    row.appendChild(cb); row.appendChild(body);
    div.appendChild(row);
  });
  return div;
}

function checkAllDone() {
  const boxes = document.querySelectorAll('#resultContent .item input[type="checkbox"]');
  if (!boxes.length) return;
  const all = [...boxes].every((b) => b.checked);
  if (all && !state.confettiFired) {
    state.confettiFired = true;
    fireConfetti();
  }
}

/* ---------- summary / share ---------- */
function buildSummaryText() {
  if (state.lastGrade) {
    const g = state.lastGrade;
    return ['HomeworkLens — grade report', '',
      `MARKS: ${g.score} / ${g.max_score} (${Math.round((g.score / g.max_score) * 100)}%)`,
      g.verdict, '',
      g.strengths.length ? 'STRENGTHS:\n' + g.strengths.map((s) => '• ' + s).join('\n') : '',
      g.missing_points.length ? 'MISSING:\n' + g.missing_points.map((s) => '• ' + s).join('\n') : '',
      '', 'Tip: ' + g.improvement, '', 'Generated by HomeworkLens'].filter(Boolean).join('\n');
  }
  const r = state.lastResult;
  if (!r) return '';
  const lines = ['HomeworkLens — clean checklist', ''];
  if (r.homework.length) {
    lines.push('HOMEWORK:');
    sortHomework(r.homework).forEach((h) => lines.push(`• [${h.subject || 'General'}] ${h.task}${h.deadline_raw ? ' — due: ' + h.deadline_raw : ''}`));
    lines.push('');
  }
  if (r.exams.length) {
    lines.push('EXAMS:');
    r.exams.forEach((e) => lines.push(`• ${e.subject}: ${e.details || ''}${e.date_raw ? ' — ' + e.date_raw : ''}`));
    lines.push('');
  }
  if (r.materials.length) {
    lines.push('BRING:');
    r.materials.forEach((m) => lines.push(`• ${m.item}`));
    lines.push('');
  }
  lines.push('Generated by HomeworkLens');
  return lines.join('\n');
}

$('copyBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildSummaryText());
    toast('Summary copied to clipboard');
  } catch (e) { toast('Copy failed', true); }
});

$('shareBtn').addEventListener('click', () => {
  window.open('https://wa.me/?text=' + encodeURIComponent(buildSummaryText()), '_blank');
});

$('printBtn').addEventListener('click', () => window.print());

$('newScanBtn').addEventListener('click', () => {
  hide('resultSection');
  show('inputSection');
});

/* ---------- history ---------- */
function getHistory() {
  try { return JSON.parse(localStorage.getItem('hl_history') || '[]'); } catch (e) { return []; }
}
function saveHistory(result, source) {
  const h = getHistory();
  h.unshift({ id: Date.now(), when: new Date().toLocaleString(), source, result });
  localStorage.setItem('hl_history', JSON.stringify(h.slice(0, 15)));
}
function renderHistory() {
  const h = getHistory();
  const list = $('historyList');
  list.innerHTML = '';
  if (!h.length) {
    list.innerHTML = '<p class="empty-group">No scans yet. Your last 15 scans will appear here.</p>';
    return;
  }
  h.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    const counts = `${item.result.homework.length} HW · ${item.result.exams.length} exams · ${item.result.materials.length} items`;
    div.innerHTML = `<span>${item.source === 'demo' ? '[demo]' : item.source === 'text' ? '[text]' : '[photo]'} ${counts}</span><span class="history-when">${item.when}</span>`;
    div.onclick = () => { hide('historySection'); renderResult(item.result); };
    list.appendChild(div);
  });
}

$('historyBtn').addEventListener('click', () => {
  hide('inputSection'); hide('resultSection');
  renderHistory();
  show('historySection');
});
$('clearHistoryBtn').addEventListener('click', () => {
  localStorage.removeItem('hl_history');
  renderHistory();
  toast('History cleared');
});

/* ---------- settings + live key check + model list ---------- */
function openSettings() {
  const s = getSettings();
  $('apiKeyInput').value = s.apiKey;
  $('langSelect').value = s.lang;
  const sel = $('modelSelect');
  if (![...sel.options].some((o) => o.value === s.model)) {
    const o = document.createElement('option');
    o.value = s.model; o.textContent = s.model + ' (saved)';
    sel.appendChild(o);
  }
  sel.value = s.model;
  $('keyStatus').textContent = '';
  show('settingsModal');
}

async function checkKeyAndModels() {
  const key = $('apiKeyInput').value.trim();
  const st = $('keyStatus');
  if (!key) { st.textContent = 'Enter an API key first.'; st.className = 'key-status error'; return; }
  st.textContent = 'Checking key…';
  st.className = 'key-status';
  $('checkKeyBtn').disabled = true;
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=' + encodeURIComponent(key));
    if (!res.ok) {
      throw new Error(res.status === 400 || res.status === 403 ? 'Invalid API key.' : 'Request failed (HTTP ' + res.status + ').');
    }
    const data = await res.json();
    const models = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .filter((m) => /^models\/gemini-/.test(m.name || ''))
      .map((m) => m.name.replace('models/', ''));
    if (!models.length) throw new Error('No Gemini models found for this key.');

    const sel = $('modelSelect');
    sel.innerHTML = '';
    models.forEach((name) => {
      const o = document.createElement('option');
      o.value = name; o.textContent = name;
      sel.appendChild(o);
    });
    const preferred = models.find((m) => m.startsWith('gemini-2.5-flash'))
      || models.find((m) => m.includes('flash'))
      || models[0];
    sel.value = preferred;
    st.textContent = 'Key valid — ' + models.length + ' models loaded.';
    st.className = 'key-status ok';
  } catch (e) {
    st.textContent = e.message;
    st.className = 'key-status error';
  } finally {
    $('checkKeyBtn').disabled = false;
  }
}

$('checkKeyBtn').addEventListener('click', checkKeyAndModels);
$('settingsBtn').addEventListener('click', openSettings);
$('openSettingsLink').addEventListener('click', (e) => { e.preventDefault(); openSettings(); });
$('closeSettingsBtn').addEventListener('click', () => hide('settingsModal'));
$('settingsModal').addEventListener('click', (e) => { if (e.target === $('settingsModal')) hide('settingsModal'); });
$('saveSettingsBtn').addEventListener('click', () => {
  saveSettings({
    apiKey: $('apiKeyInput').value.trim(),
    lang: $('langSelect').value,
    model: $('modelSelect').value || 'gemini-2.5-flash'
  });
  hide('settingsModal');
  toast('Settings saved');
});

/* ---------- main buttons & shortcuts ---------- */
$('scanBtn').addEventListener('click', () => scan(false));
$('demoBtn').addEventListener('click', () => scan(true));
$('gradeBtn').addEventListener('click', gradeScan);
$('chatText').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') scan(false);
});
$('gradeAnswer').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') gradeScan();
});

/* ---------- init ---------- */
(function init() {
  const s = getSettings();
  if (!s.apiKey) {
    setTimeout(() => toast('Welcome! Try the live demo first, or add your free Gemini key in Settings.'), 700);
  }
})();
