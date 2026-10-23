#!/usr/bin/env node
// Merges content/pastpapers.json into the topic files' exam practice.
// Safe to run again: it first removes questions it added before (ids starting "pp-"),
// and it enriches (rather than duplicates) past-paper questions that were already in a topic.
// Usage: node scripts/apply-pastpapers.js
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'content', 'pastpapers.json'), 'utf8'));
const dir = path.join(root, 'content', 'topics');
const topics = {};
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) topics[f.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const SOURCE_NOTE = { u2a: 'Source 1 is in the paper', u2b: 'Source 2 is in the paper', u3a: 'Sources 1 and 2 are in the paper', u4a: 'Extracts 1 and 2 are in the extracts booklet', p1a: 'the extract is in the paper', p2ab: 'Sources A and B are in the paper', p2ac: 'Sources A, B and Extract C are in the paper' };

// 1. remove anything added by a previous run, and old past-paper metadata
for (const t of Object.values(topics)) {
  t.exam.questions = t.exam.questions.filter((q) => !String(q.id).startsWith('pp-'));
  for (const q of t.exam.questions) { delete q.pp; delete q.ms; delete q.exq; }
}

let added = 0; let merged = 0; const missingTopic = [];
for (const paper of data.papers) {
  for (const p of paper.questions) {
    const label = `Past paper: ${paper.paper}, ${paper.series}, ${p.label}` + (SOURCE_NOTE[p.qtype] ? ` (${SOURCE_NOTE[p.qtype]})` : '');
    const meta = { paper: paper.paper, series: paper.series, part: p.label };
    // look for the same question already in any topic of this course
    const key = norm(p.key);
    let existing = null;
    for (const t of Object.values(topics)) {
      if (t.course !== paper.course) continue;
      for (const q of t.exam.questions) if (key.length > 25 && norm(q.q).includes(key)) existing = q;
    }
    if (existing) {
      existing.pp = meta;
      if (p.ms) existing.ms = p.ms;
      if (p.examiner) existing.exq = p.examiner;
      if (/^Past paper/.test(existing.label)) existing.label = label;
      merged++;
      continue;
    }
    const t = topics[p.topic];
    if (!t) { missingTopic.push(p.id); continue; }
    const q = { id: p.id, qtype: p.qtype, label, pp: meta, sections: [], q: p.q };
    if (p.prompts) q.prompts = p.prompts;
    if (p.ms) q.ms = p.ms;
    if (p.examiner) q.exq = p.examiner;
    if (p.stemNote) q.stem_note = 'The enquiry is quoted from the paper; the rest of the question is the standard wording.';
    t.exam.questions.push(q);
    added++;
  }
}
for (const [id, t] of Object.entries(topics)) fs.writeFileSync(path.join(dir, id + '.json'), JSON.stringify(t, null, 2) + '\n');
console.log(`Past papers: ${added} questions added, ${merged} existing questions enriched${missingTopic.length ? `, ${missingTopic.length} skipped (no topic)` : ''}.`);
