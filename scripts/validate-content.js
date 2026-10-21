// Checks every topic file for structural mistakes before it reaches students.
// Run: node scripts/validate-content.js
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const courses = JSON.parse(fs.readFileSync(path.join(root, 'content/courses.json'), 'utf8')).courses;
const dir = path.join(root, 'content/topics');
let errors = 0;
const err = (f, m) => { errors++; console.log(`✗ ${f}: ${m}`); };
const ids = new Set();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  let t;
  try { t = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { err(f, 'invalid JSON: ' + e.message); continue; }
  if (ids.has(t.id)) err(f, 'duplicate topic id ' + t.id); ids.add(t.id);
  const c = courses.find((x) => x.id === t.course);
  if (!c) { err(f, 'unknown course ' + t.course); continue; }
  if (c.areas && !c.areas.some((a) => a.id === t.area)) err(f, 'unknown area ' + t.area);
  const secs = new Set(t.learn.sections.map((s) => s.id));
  const uniq = (arr, what) => { const s = new Set(); for (const x of arr) { if (s.has(x.id)) err(f, `duplicate ${what} id ${x.id}`); s.add(x.id); } };
  for (const k of ['mcq', 'short', 'chronology', 'matching', 'evidence']) if (!Array.isArray(t.quizzes[k])) err(f, `quizzes.${k} missing`);
  uniq([...t.quizzes.mcq, ...t.quizzes.short, ...t.quizzes.chronology, ...t.quizzes.matching, ...t.quizzes.evidence], 'quiz');
  uniq(t.flashcards, 'flashcard'); uniq(t.checklist, 'checklist'); uniq(t.exam.questions, 'question'); uniq(t.stretch, 'stretch');
  for (const m of t.quizzes.mcq) {
    if (!(m.answer >= 0 && m.answer < m.options.length)) err(f, `mcq ${m.id} answer out of range`);
    if (new Set(m.options).size !== m.options.length) err(f, `mcq ${m.id} duplicate options`);
  }
  for (const it of [...t.quizzes.mcq, ...t.quizzes.short, ...t.quizzes.evidence, ...t.flashcards]) if (it.s && !secs.has(it.s)) err(f, `${it.id} links to missing section ${it.s}`);
  for (const k of t.checklist) { if (!['describe', 'explain', 'judge'].includes(k.level)) err(f, `checklist ${k.id} bad level`); for (const s of k.sections) if (!secs.has(s)) err(f, `checklist ${k.id} missing section ${s}`); if (!/^I can /.test(k.text)) err(f, `checklist ${k.id} should start "I can"`); }
  for (const q of t.exam.questions) {
    if (q.qtype && !(c.qtypes && c.qtypes[q.qtype])) err(f, `question ${q.id} unknown qtype ${q.qtype}`);
    if (!q.qtype) for (const k of ['asks', 'steps', 'plan', 'success', 'mistakes', 'minutes']) if (!(k in q)) err(f, `question ${q.id} missing ${k}`);
    for (const s of q.sections || []) if (!secs.has(s)) err(f, `question ${q.id} missing section ${s}`);
    if (!q.label) err(f, `question ${q.id} needs a provenance label`);
    for (const src of q.sources || []) if (!src.provenance) err(f, `question ${q.id} source without provenance`);
  }
  for (const c2 of t.quizzes.chronology) if (new Set(c2.items).size !== c2.items.length) err(f, `chronology ${c2.id} duplicates`);
  for (const m of t.quizzes.matching) if (new Set(m.pairs.map((p) => p[1])).size !== m.pairs.length) err(f, `matching ${m.id} duplicate answers`);
  for (const sh of t.quizzes.short) if (!sh.accept.length) err(f, `short ${sh.id} has no accepted answers`);
  if ((t.learn.timeline || []).length < 4) err(f, 'timeline too short for the dates quiz');
}
for (const c of courses) for (const [k, q] of Object.entries(c.qtypes || {})) for (const need of ['label', 'paper', 'marks', 'minutes', 'ao', 'asks', 'steps', 'plan', 'success', 'mistakes']) if (!(need in q)) { errors++; console.log(`✗ courses.json ${c.id}.${k} missing ${need}`); }
console.log(errors ? `${errors} problem(s)` : `All ${ids.size} topics valid`);
process.exit(errors ? 1 : 0);
