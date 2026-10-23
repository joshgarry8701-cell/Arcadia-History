'use strict';
// AI feedback. Called ONLY when a student explicitly requests feedback on a submission.
// Provider: Anthropic Messages API, key held server-side in ANTHROPIC_API_KEY.

function blocksToText(blocks) {
  return (blocks || []).map((b) => {
    if (b.p) return b.p;
    if (b.ul) return b.ul.map((x) => '- ' + x).join('\n');
    return '';
  }).filter(Boolean).join('\n');
}

// Retrieve only the course content the question is linked to (not the whole topic).
function retrieveContext(topic, question) {
  const ids = new Set(question.sections || []);
  const parts = [];
  for (const s of topic.learn.sections) {
    if (!ids.has(s.id)) continue;
    parts.push(`## ${s.title}\n${blocksToText(s.blocks)}\nKey evidence:\n${(s.evidence || []).map((e) => '- ' + e).join('\n')}`);
  }
  if (topic.learn.sources && topic.learn.sources.length && [...ids].some((id) => (topic.learn.sections.find((s) => s.id === id) || {}).blocks?.some((b) => b.sources))) {
    parts.push('## Sources (provenance)\n' + topic.learn.sources.map((x) => `- ${x.title}: ${x.date}; ${x.origin} Purpose: ${x.purpose}`).join('\n'));
  }
  return parts.join('\n\n');
}

function markSchemeUsable(q) {
  if (q.requires_sources && !(Array.isArray(q.sources) && q.sources.length)) return false;
  return !!(q.markscheme && q.markscheme.verified === true && Number.isFinite(q.markscheme.max_marks));
}

// A topic question may point at a course-level question type (qtype) holding the shared
// guidance and mark scheme. Fields on the question override the type.
function resolveQuestion(course, q) {
  const base = (q && q.qtype && course && course.qtypes && course.qtypes[q.qtype]) || {};
  const out = { ...base };
  for (const [k, v] of Object.entries(q || {})) if (v !== null && v !== undefined) out[k] = v;
  if (q && q.markscheme === undefined && base.markscheme) out.markscheme = base.markscheme;
  return out;
}

function buildPrompt({ course, topic, question, text, previous }) {
  const ms = markSchemeUsable(question) ? question.markscheme : null;
  const system = [
    `You are an experienced history teacher giving written feedback to a ${course.year} student at Arcadia British School, Dubai.`,
    'Write in clear, encouraging British English suitable for the student\'s age. Be specific and honest.',
    'Never invent facts. Only correct facts you are sure are wrong; base corrections on the course content provided.',
    ms
      ? 'A verified mark scheme is provided. Apply best-fit level descriptors. Give an INDICATIVE mark only. Do not award separate assessment-objective marks unless the mark scheme awards them separately. Never convert the mark into a qualification grade and never mention grade boundaries.'
      : 'NO verified mark scheme is available for this question. You MUST NOT give a mark, level or grade. Set "mode" to "formative" and "mark", "max" and "level" to null. Give formative feedback against the success criteria only, and list what is missing in "missing".',
    'Every item in "judgement_evidence" must quote words that appear exactly in the student\'s response.',
    'Respond with ONE JSON object only, no other text, matching this shape:',
    JSON.stringify({
      mode: 'indicative | formative',
      mark: 'number or null', max: 'number or null', level: 'string or null',
      ao_feedback: [{ ao: 'string', comment: 'string' }],
      judgement_evidence: [{ quote: 'exact words from response', comment: 'why this matters for the judgement' }],
      strengths: ['string'],
      corrections: [{ error: 'what the student wrote', correction: 'accurate version' }],
      improvements: ['2 or 3 items, most important first'],
      example_improvement: { original: 'short extract from the response', improved: 'rewritten version' },
      redraft_task: 'one focused task',
      comparison: 'only for resubmissions: what improved and what did not, else null',
      missing: ['anything that prevented full marking']
    })
  ].join('\n');

  const user = [
    `Course: ${course.year} — ${course.title}`,
    `Question (${question.label}): ${question.q}`,
    `What the question asks: ${question.asks}`,
    `Success criteria: ${(question.success || []).map((s) => '- ' + s).join('\n')}`,
    question.sources && question.sources.length ? `SOURCES / EXTRACTS PROVIDED WITH THE QUESTION:\n${question.sources.map((x) => `${x.label} — ${x.provenance}\n"""${x.text}"""`).join('\n\n')}` : (question.requires_sources ? 'The sources/extracts for this question are NOT available, so do not judge how well they were used.' : ''),
    ms ? `Verified mark scheme (${ms.source || 'teacher-entered'}):\n${JSON.stringify(ms)}` : 'Mark scheme: NOT AVAILABLE (or not yet verified by the teacher).',
    question.frame_note ? `Department writing approach: ${question.frame_note}` : '',
    question.ms ? `Indicative content from Pearson's mark scheme for this exact question (paraphrased; examples of relevant material, NOT a checklist; never penalise valid points that are not listed):\n${['extract1', 'extract2'].filter((k) => question.ms[k]).map((k) => `${k}: ${question.ms[k]}`).concat(...['points', 'context', 'support', 'challenge'].filter((k) => (question.ms[k] || []).length).map((k) => question.ms[k].map((x) => `${k}: ${x}`))).join('\n')}` : '',
    question.exq ? `Examiner's report on this exact question (${question.exq.series}):\n${[...(question.exq.strong || []).map((x) => '+ ' + x), ...(question.exq.weak || []).map((x) => '- ' + x)].join('\n')}` : '',
    question.examiner && question.examiner.length ? `What Pearson examiners reported (use to target feedback, never to award marks outside the mark scheme):\n${question.examiner.map((r) => [...(r.strong || []).map((x) => '+ ' + x), ...(r.weak || []).map((x) => '- ' + x)].join('\n')).join('\n')}` : '',
    `Relevant course content:\n${retrieveContext(topic, question)}`,
    previous ? `PREVIOUS ATTEMPT (for comparison):\n"""${previous.text}"""\nPrevious feedback priorities: ${JSON.stringify((previous.ai && previous.ai.improvements) || [])}` : '',
    `STUDENT RESPONSE:\n"""${text}"""`
  ].filter(Boolean).join('\n\n');

  return { system, user, hasMarkScheme: !!ms };
}

function normalise(raw, { text, question, hasMarkScheme, isResubmission }) {
  let obj;
  const m = String(raw).match(/\{[\s\S]*\}/);
  try { obj = JSON.parse(m ? m[0] : raw); } catch { throw new Error('The AI reply could not be read. Your draft is saved; try again later.'); }
  const arr = (x) => (Array.isArray(x) ? x : []);
  const out = {
    mode: hasMarkScheme ? 'indicative' : 'formative',
    mark: null, max: null, level: null,
    ao_feedback: arr(obj.ao_feedback),
    judgement_evidence: arr(obj.judgement_evidence).filter((e) => e && typeof e.quote === 'string' && e.quote.length > 2 && text.includes(e.quote.trim())),
    strengths: arr(obj.strengths).slice(0, 4),
    corrections: arr(obj.corrections),
    improvements: arr(obj.improvements).slice(0, 3),
    example_improvement: obj.example_improvement && obj.example_improvement.improved ? obj.example_improvement : null,
    redraft_task: typeof obj.redraft_task === 'string' ? obj.redraft_task : '',
    comparison: isResubmission && typeof obj.comparison === 'string' ? obj.comparison : null,
    missing: arr(obj.missing)
  };
  if (hasMarkScheme) {
    const max = question.markscheme.max_marks;
    const mark = Number(obj.mark);
    if (Number.isFinite(mark) && mark >= 0 && mark <= max) { out.mark = Math.round(mark); out.max = max; out.level = obj.level || null; }
    else out.missing.push('The AI did not return a valid mark within the mark range, so no mark is shown.');
    if (!question.markscheme.ao_separate) out.ao_feedback = out.ao_feedback.map((a) => ({ ao: a.ao, comment: a.comment }));
  } else {
    out.ao_feedback = [];
    if (!out.missing.length) out.missing.push('No verified mark scheme or department criteria for this question yet, so feedback is formative only.');
  }
  return out;
}

// Conservative token estimate (about 3 characters per token).
const estimateTokens = (s) => Math.ceil(String(s).length / 3);

async function callAnthropic({ apiKey, model, system, user, maxTokens, baseUrl, timeoutMs = 90000 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch((baseUrl || 'https://api.anthropic.com') + '/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`AI provider error ${res.status}: ${(body.error && body.error.message) || 'unknown'}`);
    const textOut = (body.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    return { text: textOut, usage: body.usage || {} };
  } finally { clearTimeout(timer); }
}

module.exports = { buildPrompt, normalise, estimateTokens, callAnthropic, markSchemeUsable, retrieveContext, resolveQuestion };
