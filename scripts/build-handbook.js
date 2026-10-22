#!/usr/bin/env node
// Builds a single readable handbook (Markdown) and a single JSON file containing
// every course, exam guide, mark scheme, examiner report summary and topic.
// Usage: node scripts/build-handbook.js <outDir>
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = process.argv[2] || path.join(root, 'dist', 'handbook');
fs.mkdirSync(out, { recursive: true });

const courses = JSON.parse(fs.readFileSync(path.join(root, 'content', 'courses.json'), 'utf8')).courses;
const topics = fs.readdirSync(path.join(root, 'content', 'topics')).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(root, 'content', 'topics', f), 'utf8')))
  .sort((a, b) => (a.course === b.course ? (a.order || 0) - (b.order || 0) : a.course.localeCompare(b.course)));

fs.writeFileSync(path.join(out, 'all-content.json'), JSON.stringify({
  generated: new Date().toISOString().slice(0, 10),
  note: 'Every course and topic of Mr Garry\'s History Revision Hub. courses[].qtypes are question types (exam guide, mark scheme, frames, models, examiner advice); topics[].exam.questions[].qtype points to them.',
  courses, topics,
}, null, 2));

const L = [];
const p = (s = '') => L.push(s);
const list = (arr, f = (x) => x) => (arr || []).forEach((x) => p(`- ${f(x)}`));
const num = (arr, f = (x) => x) => (arr || []).forEach((x, i) => p(`${i + 1}. ${f(x)}`));
const esc = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

function frames(qt) {
  const fs_ = qt.frames || (qt.frame ? [{ name: 'Writing frame', ...qt.frame }] : []);
  for (const f of fs_) {
    p(`**${f.name || 'Writing frame'} — sentence starters**`); p();
    num(f.full); p();
    if (f.some) { p('*Lighter support (headings only):* ' + f.some.join(' → ')); p(); }
  }
}
function model(m, note) {
  if (!m || !m.length) return;
  p('**Annotated model answer**'); p();
  for (const s of m) { p(`> ${s.t}`); p(`>`); p(`> *${s.n}*`); p(); }
  p(`*${note || 'An example, not the only way to answer.'}*`); p();
}
function levels(ms) {
  if (!ms || !ms.levels) return;
  p(`**Mark scheme levels** (${ms.max_marks || ''} marks${ms.verified ? '' : ' — awaiting teacher check'}; source: ${ms.source || 'n/a'})`); p();
  p('| Level | Marks | Descriptor |'); p('|---|---|---|');
  for (const l of ms.levels) p(`| ${esc(l.level)} | ${esc(l.marks)} | ${esc(Array.isArray(l.descriptor) ? l.descriptor.join(' ') : l.descriptor || l.text || '')} |`);
  p();
}
function examiner(ex) {
  for (const r of ex || []) {
    p(`**What examiners said — ${r.series}**${r.url ? ` ([report](${r.url}))` : ''}`); p();
    if (r.strong) { p('Strong answers:'); list(r.strong); p(); }
    if (r.weak) { p('Common weaknesses:'); list(r.weak); p(); }
  }
}
function qtypeSection(key, qt) {
  p(`#### ${qt.label} \`${key}\``); p();
  p(`${qt.paper || ''} · ${qt.marks} marks · about ${qt.minutes} minutes · ${qt.ao || ''}${qt.requires_sources ? ' · needs the sources/extracts from the paper' : ''}`); p();
  if (qt.template) { p(`**How it is worded:** ${qt.template}`); p(); }
  if (qt.asks) { p(`**What it asks:** ${qt.asks}`); p(); }
  if (qt.steps) { p('**Step by step**'); p(); num(qt.steps); p(); }
  if (qt.plan) { p(`**Planning and timing:** ${qt.plan}`); p(); }
  if (qt.success) { p('**Success criteria**'); p(); list(qt.success); p(); }
  if (qt.criteria_list) { p('**Judgement criteria**'); p(); list(qt.criteria_list); p(); }
  if (qt.evidence_tip) { p(`*${qt.evidence_tip}*`); p(); }
  levels(qt.markscheme);
  if (qt.mistakes) { p('**Common mistakes**'); p(); list(qt.mistakes); p(); }
  examiner(qt.examiner);
  frames(qt);
  model(qt.model, qt.model_note);
}

p('# Mr Garry\'s History Revision Hub — Content Handbook');
p();
p(`Arcadia British School Dubai · generated ${new Date().toISOString().slice(0, 10)} · ${courses.length} courses · ${topics.length} topics`);
p();
p('Everything the site teaches, in one document: exam structures, assessment objectives, question-type guides, mark-scheme levels, examiner-report advice, writing frames (sentence starters), annotated models, and for every topic the Learn notes, timeline, key people, vocabulary, misconceptions, quizzes, flashcards, checklist, exam questions and stretch tasks.');
p();
p('**Accuracy rules.** Exam requirements come only from Pearson specifications, mark schemes and examiner reports. Past-paper questions are labelled with their series; everything else is labelled teacher-created. Topic notes are original writing awaiting Mr Garry\'s check. Mark-scheme wording is paraphrased; Pearson materials remain Pearson copyright.');
p();
p('## Contents'); p();
for (const c of courses) p(`- [${c.year}: ${c.title}](#${c.id})`);
p();

for (const c of courses) {
  p(`<a id="${c.id}"></a>`); p(`## ${c.year}: ${c.title}`); p();
  if (c.enquiry) { p(`*${c.enquiry}*`); p(); }
  if (c.separation_note) { p(c.separation_note); p(); }
  if (c.assessment) {
    const a = c.assessment;
    p(typeof a === 'string' ? `**Assessment:** ${a}` : `**Assessment:** ${a.type || ''}${a.criteria_status === 'missing' ? ' — criteria not yet supplied, so AI feedback is formative only' : ''}. ${a.notes || ''}`);
    p();
  }
  const ex = c.exam;
  if (ex) {
    p('### The exam'); p();
    p(`${ex.board || ''} ${ex.qualification || ''} · ${ex.codes || ''} · specification: ${ex.specification_version || ''}`); p();
    for (const pp of ex.papers || []) { p(`- **${pp.code} ${pp.title}** — ${pp.duration || ''}${pp.marks ? `, ${pp.marks} marks` : ''}${pp.weighting ? `, ${pp.weighting}` : ''}. ${pp.structure || pp.summary || ''}`); }
    p();
    if (ex.aos) { p('**Assessment objectives**'); p(); list(ex.aos, (a) => `${a.ao}: ${a.text}${a.weight ? ` (${a.weight})` : ''}`); p(); }
    if (ex.source_focus) { p(`**${ex.source_focus.title}**`); p(); list(ex.source_focus.items); p(); }
    if (ex.conflicts && ex.conflicts.length) { p('**Conflicts found in the documents (for the teacher)**'); p(); list(ex.conflicts, (x) => (typeof x === 'string' ? x : x.text || JSON.stringify(x))); p(); }
    if (ex.sources) { p('**Where the exam details come from**'); p(); list(ex.sources, (s) => `${s.title}${s.url ? ` — ${s.url}` : ''}${s.note ? ` (${s.note})` : ''}`); p(); }
  }
  if (c.qtypes && Object.keys(c.qtypes).length) {
    p('### Exam guide: question types'); p();
    for (const [k, qt] of Object.entries(c.qtypes)) qtypeSection(k, qt);
  }
  const ts = topics.filter((t) => t.course === c.id);
  if (!ts.length) { p('*No topics written yet.*'); p(); continue; }
  let lastArea = null;
  for (const t of ts) {
    const area = (c.areas || []).find((a) => a.id === t.area);
    if (area && area.id !== lastArea) { p(`### ${area.title}${area.paper ? ` — ${area.paper}` : ''}`); p(); lastArea = area.id; }
    p(`#### ${t.kt ? t.kt + ': ' : ''}${t.title}`); p();
    p(`\`${t.id}\`${area ? ` · ${area.title}` : ''}${t.status === 'draft' ? ' · DRAFT' : ''}`); p();
    const le = t.learn || {};
    if (le.intro) { p(le.intro); p(); }
    for (const s of le.sections || []) {
      p(`##### ${s.title}`); p();
      for (const b of s.blocks || []) { if (b.p) { p(b.p); p(); } if (b.ul) { list(b.ul); p(); } }
      if (s.terms && s.terms.length) { p(`*Key terms:* ${s.terms.join(', ')}`); p(); }
      if (s.evidence && s.evidence.length) { p('*Precise evidence:*'); list(s.evidence); p(); }
      if (s.refs && s.refs.length) { p(`*Read more:* ${s.refs.map((r) => (typeof r === 'string' ? r : r.text || JSON.stringify(r))).join('; ')}`); p(); }
    }
    if (le.timeline) { p('**Timeline**'); p(); p('| Date | Event |'); p('|---|---|'); for (const e of le.timeline) p(`| ${esc(e.date)} | ${esc(e.event)} |`); p(); }
    if (le.people) { p('**Key people**'); p(); list(le.people, (x) => `**${x.name}** — ${x.role}`); p(); }
    if (le.vocab) { p('**Vocabulary**'); p(); list(le.vocab, (x) => `**${x.term}** — ${x.def}`); p(); }
    if (le.misconceptions) { p('**Misconceptions**'); p(); list(le.misconceptions, (x) => `✗ ${x.wrong} → ✓ ${x.right}`); p(); }
    const qz = t.quizzes || {};
    if (qz.mcq) { p('**Knowledge quiz (multiple choice)** — answer in bold'); p(); num(qz.mcq, (q) => `${q.q} ${q.options.map((o, i) => (i === q.answer ? `**${o}**` : o)).join(' / ')}${q.why ? ` — *${q.why}*` : ''}`); p(); }
    if (qz.short) { p('**Short answers**'); p(); num(qz.short, (q) => `${q.q} — **${q.answer}**`); p(); }
    for (const c1 of qz.chronology || []) { p(`**Chronology — ${c1.title}** (correct order): ${c1.items.join(' → ')}`); p(); }
    for (const m of qz.matching || []) { p(`**Matching — ${m.title}**`); p(); list(m.pairs, (x) => `${x[0]} = ${x[1]}`); p(); }
    if (qz.evidence) { p('**Evidence recall**'); p(); list(qz.evidence, (q) => `${q.q} — *Model:* ${q.model}`); p(); }
    if (t.flashcards) { p('**Flashcards**'); p(); p('| Question | Answer | Hint |'); p('|---|---|---|'); for (const f of t.flashcards) p(`| ${esc(f.q)} | ${esc(f.a)} | ${esc(f.hint)} |`); p(); }
    if (t.checklist) { p('**Personal learning checklist** (rate red / amber / green)'); p(); list(t.checklist, (k) => `[${{ describe: 'Describe — red', explain: 'Explain — amber', judge: 'Judge — green' }[k.level] || k.level}] ${k.text}`); p(); }
    if (t.exam && t.exam.questions) {
      p('**Exam practice**'); p();
      for (const q of t.exam.questions) {
        const qt = q.qtype && c.qtypes ? c.qtypes[q.qtype] : null;
        p(`- *${q.label}*${qt ? ` — ${qt.label}, ${qt.marks} marks` : q.marks ? ` — ${q.marks} marks` : ''}`);
        p(`  ${String(q.q).replace(/\n/g, ' ')}`);
        if (q.prompts) p(`  Prompts: ${q.prompts.join('; ')}`);
        for (const s of q.sources || []) p(`  > **${s.label}** — ${s.provenance}: ${s.text}`);
      }
      p();
      for (const q of t.exam.questions) {
        if (!q.qtype && (q.steps || q.frame)) { p(`*Guide for "${q.q}"*`); p(); if (q.steps) num(q.steps); p(); if (q.success) { list(q.success); p(); } if (q.frame) frames(q); }
        if (q.model) model(q.model, q.model_note);
      }
    }
    if (t.stretch) { p('**Stretch and challenge**'); p(); list(t.stretch, (s) => `**${s.kind}:** ${s.task}`); p(); }
  }
}
fs.writeFileSync(path.join(out, 'CONTENT_HANDBOOK.md'), L.join('\n'));
console.log(`Wrote ${out}/CONTENT_HANDBOOK.md (${Math.round(L.join('\n').length / 1024)} KB) and all-content.json`);
