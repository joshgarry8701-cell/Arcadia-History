'use strict';
// API tests. The AI provider is replaced by a test double here ONLY — the real app calls the Claude API.
const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../server/app');

const apps = [];
test.after(() => { for (const a of apps) { a.server.closeAllConnections(); a.server.close(); } });

function start(extraEnv = {}, provider) {
  const app = createApp({ dbFile: ':memory:', quiet: true, env: { TEACHER_PASSWORD: 'teacher-pass-123', ANTHROPIC_API_KEY: 'test-key', ...extraEnv }, provider });
  apps.push(app);
  return new Promise((r) => app.server.listen(0, () => r({ app, base: `http://127.0.0.1:${app.server.address().port}` })));
}

function client(base) {
  let cookie = '';
  const call = async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', 'x-hub': '1', cookie }, body: body ? JSON.stringify(body) : undefined });
    const sc = res.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    return { status: res.status, body: await res.json() };
  };
  return { get: (u) => call('GET', u), post: (u, b) => call('POST', u, b || {}), put: (u, b) => call('PUT', u, b), del: (u) => call('DELETE', u) };
}

const GOOD = JSON.stringify({ mode: 'formative', mark: 7, max: 10, level: 'L3', strengths: ['Clear point'], judgement_evidence: [{ quote: 'the south coast', comment: 'precise' }, { quote: 'invented words not in response', comment: 'x' }], corrections: [], improvements: ['a', 'b', 'c', 'd'], example_improvement: { original: 'x', improved: 'y' }, redraft_task: 'Add a date', comparison: 'Better', missing: [] });
const ANSWER = 'Stamford Bridge was important because it left the south coast undefended when William landed at Pevensey on 28 September, only three days after the battle in the north, so his army landed safely.';

async function setup(provider, env) {
  const { app, base } = await start(env, provider || (async () => ({ text: GOOD, usage: { input_tokens: 2000, output_tokens: 500 } })));
  const t = client(base);
  assert.equal((await t.post('/api/login', { username: 'mrgarry', secret: 'teacher-pass-123' })).status, 200);
  const made = await t.post('/api/teacher/students', { students: [{ username: 'y7.amy', class: '7A' }, { username: 'y7.ben', class: '7A' }] });
  assert.equal(made.status, 200);
  const [amy, ben] = made.body.created;
  const a = client(base), b = client(base);
  assert.equal((await a.post('/api/login', { username: 'Y7.AMY', secret: amy.code.toUpperCase() })).status, 200, 'codes are case-insensitive');
  assert.equal((await b.post('/api/login', { username: 'y7.ben', secret: ben.code })).status, 200);
  return { app, base, t, a, b };
}

test('sign-in, roles and permissions', async () => {
  const { app, base, a, t } = await setup();
  const anon = client(base);
  assert.equal((await anon.get('/api/catalog')).status, 401);
  assert.equal((await anon.post('/api/login', { username: 'mrgarry', secret: 'wrong' })).status, 401);
  assert.equal((await a.get('/api/teacher/students')).status, 403, 'students cannot reach teacher routes');
  assert.equal((await a.put('/api/teacher/settings', { ai_enabled: false })).status, 403);
  assert.equal((await t.get('/api/progress')).status, 403, 'progress routes are student-only');
  // CSRF header required
  const r = await fetch(base + '/api/logout', { method: 'POST' });
  assert.equal(r.status, 403);
  // Students never see mark scheme detail
  const top = await a.get('/api/topics/y7-hastings');
  assert.equal(top.status, 200);
  assert.ok(top.body.topic.exam.questions.every((q) => q.markscheme === null || Object.keys(q.markscheme).length <= 2));
  app.server.closeAllConnections(); app.server.close();
});

test('progress persists and is private', async () => {
  const { app, a, b } = await setup();
  assert.equal((await a.put('/api/progress', { progress: { checklist: { k1: 'green' }, flash: { f1: { box: 3 } } } })).status, 200);
  const again = await a.get('/api/progress');
  assert.equal(again.body.progress.checklist.k1, 'green');
  const other = await b.get('/api/progress');
  assert.deepEqual(other.body.progress, {}, 'another student cannot see it');
  app.server.closeAllConnections(); app.server.close();
});

test('submissions are private; teacher can review and override', async () => {
  const { app, a, b, t } = await setup();
  const s = await a.post('/api/submissions', { topic_id: 'y7-hastings', question_id: 'q2', text: ANSWER });
  assert.equal(s.status, 200);
  const id = s.body.submission.id;
  assert.equal((await b.put('/api/submissions/' + id, { text: 'hijack' })).status, 404);
  assert.equal((await b.post('/api/submissions/' + id + '/feedback')).status, 404);
  assert.equal((await b.get('/api/submissions')).body.submissions.length, 0);
  // Teacher settings: prices required before marking
  let fb = await a.post('/api/submissions/' + id + '/feedback');
  assert.equal(fb.status, 503);
  assert.match(fb.body.error, /prices/);
  await t.put('/api/teacher/settings', { price_input_per_mtok: 3, price_output_per_mtok: 15, cooldown_seconds: 0 });
  fb = await a.post('/api/submissions/' + id + '/feedback');
  assert.equal(fb.status, 200, JSON.stringify(fb.body));
  const ai = fb.body.submission.ai;
  assert.equal(ai.mode, 'formative', 'no verified mark scheme → no mark');
  assert.equal(ai.mark, null);
  assert.equal(ai.improvements.length, 3, 'max three improvements');
  assert.equal(ai.judgement_evidence.length, 1, 'quotes not in the response are dropped');
  assert.equal(ai.comparison, null, 'first attempt has no comparison');
  const subs = await t.get('/api/teacher/submissions');
  assert.equal(subs.body.submissions.length, 1);
  const rev = await t.put('/api/teacher/submissions/' + id + '/review', { mark: 6, max: 10, comment: 'Good use of dates', overrides_ai: true });
  assert.equal(rev.status, 200);
  const mine = await a.get('/api/submissions');
  assert.equal(mine.body.submissions[0].teacher.comment, 'Good use of dates');
  // Redraft with comparison
  const re = await a.post('/api/submissions', { topic_id: 'y7-hastings', question_id: 'q2', text: ANSWER + ' This was the most important effect.', parent_id: id });
  const fb2 = await a.post('/api/submissions/' + re.body.submission.id + '/feedback');
  assert.equal(fb2.status, 200);
  assert.equal(fb2.body.submission.ai.comparison, 'Better');
  app.server.closeAllConnections(); app.server.close();
});

test('verified mark scheme enables an indicative mark, clamped to range', async () => {
  let reply = JSON.stringify({ mark: 9, level: 'Level 3', improvements: ['x'], strengths: [], judgement_evidence: [] });
  const { app, a, t } = await setup(async () => ({ text: reply, usage: { input_tokens: 100, output_tokens: 100 } }));
  await t.put('/api/teacher/settings', { price_input_per_mtok: 3, price_output_per_mtok: 15, cooldown_seconds: 0 });
  const c = await t.get('/api/teacher/content/' + encodeURIComponent('topic:y7-hastings'));
  c.body.data.exam.questions[1].markscheme = { verified: true, source: 'Test', max_marks: 8, levels: [] };
  assert.equal((await t.put('/api/teacher/content/' + encodeURIComponent('topic:y7-hastings'), { data: c.body.data, status: 'published' })).status, 200);
  const s = await a.post('/api/submissions', { topic_id: 'y7-hastings', question_id: 'q2', text: ANSWER });
  let fb = await a.post('/api/submissions/' + s.body.submission.id + '/feedback');
  assert.equal(fb.body.submission.ai.mode, 'indicative');
  assert.equal(fb.body.submission.ai.mark, null, '9/8 is out of range so no mark shown');
  reply = JSON.stringify({ mark: 6, level: 'Level 3', improvements: ['x'] });
  const s2 = await a.post('/api/submissions', { topic_id: 'y7-hastings', question_id: 'q2', text: ANSWER });
  fb = await a.post('/api/submissions/' + s2.body.submission.id + '/feedback');
  assert.equal(fb.body.submission.ai.mark, 6);
  assert.equal(fb.body.submission.ai.max, 8);
  app.server.closeAllConnections(); app.server.close();
});

test('cost controls: word limit, daily limit, cooldown, hard budget ceiling', async () => {
  let calls = 0;
  const { app, a, t } = await setup(async () => { calls++; return { text: GOOD, usage: { input_tokens: 2000, output_tokens: 500 } }; });
  await t.put('/api/teacher/settings', { price_input_per_mtok: 3, price_output_per_mtok: 15, cooldown_seconds: 0, max_words: 50, daily_marks_per_student: 2 });
  const long = await a.post('/api/submissions', { topic_id: 'y7-hastings', question_id: 'q2', text: 'word '.repeat(70) });
  assert.equal((await a.post('/api/submissions/' + long.body.submission.id + '/feedback')).status, 413);
  for (let i = 0; i < 2; i++) {
    const s = await a.post('/api/submissions', { topic_id: 'y7-hastings', question_id: 'q2', text: ANSWER });
    assert.equal((await a.post('/api/submissions/' + s.body.submission.id + '/feedback')).status, 200);
  }
  const s3 = await a.post('/api/submissions', { topic_id: 'y7-hastings', question_id: 'q2', text: ANSWER });
  assert.equal((await a.post('/api/submissions/' + s3.body.submission.id + '/feedback')).status, 429, 'daily limit');
  assert.equal(calls, 2);
  // Budget: each call costs 0.0135; set ceiling just above spend
  await t.put('/api/teacher/settings', { daily_marks_per_student: 50, monthly_budget_usd: 0.03 });
  const s4 = await a.post('/api/submissions', { topic_id: 'y7-hastings', question_id: 'q2', text: ANSWER });
  const r4 = await a.post('/api/submissions/' + s4.body.submission.id + '/feedback');
  assert.equal(r4.status, 503, 'worst-case estimate would exceed ceiling, so the request is never sent');
  assert.equal(calls, 2);
  const kept = (await a.get('/api/submissions')).body.submissions.find((x) => x.id === s4.body.submission.id);
  assert.equal(kept.text, ANSWER, 'draft preserved');
  // Cooldown
  await t.put('/api/teacher/settings', { monthly_budget_usd: 100, cooldown_seconds: 600 });
  assert.equal((await a.post('/api/submissions/' + s4.body.submission.id + '/feedback')).status, 429);
  app.server.closeAllConnections(); app.server.close();
});

test('AI failure preserves the draft and revision still works', async () => {
  const { app, a, t } = await setup(async () => { throw new Error('provider down'); });
  await t.put('/api/teacher/settings', { price_input_per_mtok: 3, price_output_per_mtok: 15, cooldown_seconds: 0 });
  const s = await a.post('/api/submissions', { topic_id: 'y7-hastings', question_id: 'q1', text: ANSWER });
  const r = await a.post('/api/submissions/' + s.body.submission.id + '/feedback');
  assert.equal(r.status, 502);
  const kept = (await a.get('/api/submissions')).body.submissions[0];
  assert.equal(kept.status, 'error');
  assert.equal(kept.text, ANSWER);
  assert.equal((await a.get('/api/topics/y7-hastings')).status, 200);
  assert.equal((await a.put('/api/progress', { progress: { x: 1 } })).status, 200);
  app.server.closeAllConnections(); app.server.close();
});

test('no API key → marking clearly unavailable, never simulated', async () => {
  const { app, a, t } = await setup(undefined, { ANTHROPIC_API_KEY: '' });
  await t.put('/api/teacher/settings', { price_input_per_mtok: 3, price_output_per_mtok: 15 });
  const s = await a.post('/api/submissions', { topic_id: 'y7-hastings', question_id: 'q1', text: ANSWER });
  const r = await a.post('/api/submissions/' + s.body.submission.id + '/feedback');
  assert.equal(r.status, 503);
  assert.match(r.body.error, /No AI provider key/);
  app.server.closeAllConnections(); app.server.close();
});

test('drafts are hidden from students; deletion and export work', async () => {
  const { app, a, t } = await setup();
  const c = await t.get('/api/teacher/content/' + encodeURIComponent('topic:y7-hastings'));
  await t.put('/api/teacher/content/' + encodeURIComponent('topic:y7-hastings'), { data: c.body.data, status: 'draft' });
  assert.equal((await a.get('/api/topics/y7-hastings')).status, 404);
  assert.ok(!('y7-hastings' in (await a.get('/api/catalog')).body.topics), 'draft topic hidden from catalog');
  await t.put('/api/teacher/content/' + encodeURIComponent('topic:y7-hastings'), { data: c.body.data, status: 'published' });
  await a.put('/api/progress', { progress: { checklist: { k2: 'amber' } } });
  const mine = await a.get('/api/my-data');
  assert.equal(mine.body.progress.checklist.k2, 'amber');
  const st = (await t.get('/api/teacher/students')).body.students.find((s) => s.username === 'y7.amy');
  assert.equal((await t.get('/api/teacher/students/' + st.id + '/export')).body.user.username, 'y7.amy');
  assert.equal((await t.del('/api/teacher/students/' + st.id)).status, 200);
  assert.equal((await a.get('/api/progress')).status, 401, 'deleted student is signed out');
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM progress').get().n, 0);
  app.server.closeAllConnections(); app.server.close();
});

test('backup and restore round trip', async () => {
  const { app, base, a, t } = await setup();
  await a.put('/api/progress', { progress: { checklist: { k5: 'red' } } });
  const backup = (await t.get('/api/teacher/backup')).body;
  await a.put('/api/progress', { progress: { checklist: { k5: 'green' } } });
  const r = await t.post('/api/teacher/restore', backup);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  // sessions are cleared by restore
  assert.equal((await a.get('/api/progress')).status, 401);
  const t2 = client(base);
  assert.equal((await t2.post('/api/login', { username: 'mrgarry', secret: 'teacher-pass-123' })).status, 200);
  const prog = (await t2.get('/api/teacher/progress')).body.progress;
  assert.equal(prog[0].progress.checklist.k5, 'red', 'restored to backup state');
  assert.equal((await t2.post('/api/teacher/restore', { format: 'nope' })).status, 400);
  app.server.closeAllConnections(); app.server.close();
});

test('students can send work to the teacher without AI; drafts stay private', async () => {
  const { a, t } = await setup(undefined, { ANTHROPIC_API_KEY: '' });
  const s = await a.post('/api/submissions', { topic_id: 'y7-hastings', question_id: 'q3', text: ANSWER });
  assert.equal((await t.get('/api/teacher/submissions')).body.submissions.length, 0, 'draft not visible to teacher');
  const sent = await a.post('/api/submissions/' + s.body.submission.id + '/submit');
  assert.equal(sent.body.submission.status, 'submitted');
  assert.equal((await t.get('/api/teacher/submissions')).body.submissions.length, 1);
  assert.equal((await a.put('/api/submissions/' + s.body.submission.id, { text: 'changed' })).status, 409, 'sent work is locked');
});

test('question types: shared mark scheme gives indicative marks; source questions need their sources', async () => {
  let lastPrompt = '';
  const { a, t } = await setup(async ({ user }) => { lastPrompt = user; return { text: JSON.stringify({ mark: 17, level: 'Level 3', improvements: ['x'] }), usage: { input_tokens: 100, output_tokens: 100 } }; });
  await t.put('/api/teacher/settings', { price_input_per_mtok: 3, price_output_per_mtok: 15, cooldown_seconds: 0, daily_marks_per_student: 50 });
  const essay = 'Some historians argue that territorial loss was the most damaging consequence of Versailles, whilst others argue that reparations did more damage because they led to the Ruhr occupation and hyperinflation in 1923.';
  // Unverified course mark scheme → formative
  let s = await a.post('/api/submissions', { topic_id: 'y12-de-1', question_id: 'q1', text: essay });
  let fb = await a.post('/api/submissions/' + s.body.submission.id + '/feedback');
  assert.equal(fb.status, 200, JSON.stringify(fb.body));
  assert.equal(fb.body.submission.ai.mode, 'formative');
  assert.match(lastPrompt, /Assess this view/);
  // Teacher verifies the shared Unit 1 scheme
  const c = await t.get('/api/teacher/content/courses');
  const y12 = c.body.data.courses.find((x) => x.id === 'y12');
  y12.qtypes.u1.markscheme.verified = true;
  assert.equal((await t.put('/api/teacher/content/courses', { data: c.body.data, status: 'published' })).status, 200);
  s = await a.post('/api/submissions', { topic_id: 'y12-de-1', question_id: 'q1', text: essay });
  fb = await a.post('/api/submissions/' + s.body.submission.id + '/feedback');
  assert.equal(fb.body.submission.ai.mode, 'indicative');
  assert.equal(fb.body.submission.ai.mark, 17);
  assert.equal(fb.body.submission.ai.max, 25);
  assert.match(lastPrompt, /Level 4|19–25/);
  assert.match(lastPrompt, /duration, scope, effectiveness, impact/, 'department frame passed to the marker');
  // Section A: verify scheme; question with sources → indicative and sources in prompt
  const y13 = c.body.data.courses.find((x) => x.id === 'y13');
  y13.qtypes.u3a.markscheme.verified = true;
  await t.put('/api/teacher/content/courses', { data: c.body.data, status: 'published' });
  s = await a.post('/api/submissions', { topic_id: 'y13-cr-2', question_id: 'q1', text: essay });
  fb = await a.post('/api/submissions/' + s.body.submission.id + '/feedback');
  assert.equal(fb.body.submission.ai.mode, 'indicative');
  assert.match(lastPrompt, /color-blind/, 'source text sent to the marker');
  // Past-paper Section A without its sources → formative only
  s = await a.post('/api/submissions', { topic_id: 'y13-cr-6', question_id: 'q2', text: essay });
  fb = await a.post('/api/submissions/' + s.body.submission.id + '/feedback');
  assert.equal(fb.body.submission.ai.mode, 'formative');
  assert.equal(fb.body.submission.ai.mark, null);
  assert.match(lastPrompt, /NOT available/);
});
