// Expands compact KS3 topic definitions into full topic files (content/topics/*.json).
'use strict';
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, '..', '..', 'content', 'topics');
const REVIEW = { state: 'awaiting-teacher-check', note: "Built from Mr Garry's own lessons for this unit (2026–27 scheme of work). Check wording against the lesson PowerPoints before relying on it." };
function T(d) {
  const t = {
    id: d.id, course: d.course, area: d.area, order: d.order, kt: d.kt, title: d.title, status: 'published', review: REVIEW,
    learn: {
      intro: d.intro,
      sections: d.sections.map(([id, title, paras, terms, evidence]) => ({ id, title, blocks: paras.map((p) => Array.isArray(p) ? { ul: p } : { p }), terms: terms || [], evidence: evidence || [] })),
      timeline: d.timeline.map(([date, event]) => ({ date, event })),
      people: (d.people || []).map(([name, role]) => ({ name, role })),
      vocab: d.vocab.map(([term, def]) => ({ term, def })),
      misconceptions: d.myths.map(([wrong, right]) => ({ wrong, right })),
      sources: d.sources || []
    },
    quizzes: {
      mcq: d.mcq.map(([s, q, options, answer, why], i) => ({ id: 'm' + (i + 1), s, q, options, answer, why })),
      short: d.short.map(([s, q, accept, answer], i) => ({ id: 'a' + (i + 1), s, q, accept: accept.map((x) => x.toLowerCase()), answer })),
      chronology: d.chron.map(([title, items], i) => ({ id: 'c' + (i + 1), title, items })),
      matching: d.match.map(([title, pairs], i) => ({ id: 'x' + (i + 1), title, pairs })),
      evidence: d.evid.map(([s, q, keywords, model], i) => ({ id: 'e' + (i + 1), s, q, keywords, model }))
    },
    flashcards: d.flash.map(([s, q, a, hint], i) => ({ id: 'f' + (i + 1), s, q, a, ...(hint ? { hint } : {}) })),
    checklist: d.check.map(([level, text, sections], i) => ({ id: 'k' + (i + 1), level, text, sections })),
    exam: { criteria_status: 'missing', criteria_note: 'Practice questions written for this unit. AI feedback is formative only (no marks) until department KS3 criteria are added.', questions: d.exam.map((q, i) => ({ id: 'q' + (i + 1), label: 'Teacher-created practice question', markscheme: null, ...q })) },
    stretch: d.stretch.map(([kind, task], i) => ({ id: 't' + (i + 1), kind, task })),
    planning: d.planning
  };
  fs.writeFileSync(path.join(out, t.id + '.json'), JSON.stringify(t, null, 2) + '\n');
  return t.id;
}
// PEEJ + Arcadia writing frame (qualifier, precise evidence, explaining connective, judgement)
const peej = (point, evid, explain, judge) => ({
  full: [point, evid, explain, judge],
  some: ['P: qualified claim (highly / partly / to some extent…)', 'E: precise evidence (name, date, number, source)', 'E: explain with a connective (because / this meant that / therefore)', 'J: judgement that answers the question']
});
module.exports = { T, peej };
