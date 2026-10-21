'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const D = require('./db');
const A = require('./auth');
const M = require('./marking');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const CONTENT = path.join(ROOT, 'content');
const MAX_BODY = 2 * 1024 * 1024;
const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const words = (t) => (String(t).trim().match(/\S+/g) || []).length;

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

function createApp(opts = {}) {
  const env = { ...process.env, ...(opts.env || {}) };
  const db = D.open(opts.dbFile || env.DB_FILE || path.join(ROOT, 'data', 'hub.sqlite'));
  const cookieSecure = env.COOKIE_SECURE === 'true';
  const provider = opts.provider || M.callAnthropic;
  let reservedUsd = 0; // in-flight worst-case AI spend, so parallel requests cannot overshoot the ceiling

  // ---------- bootstrap ----------
  // Content files are loaded into the database. New files are added on every start;
  // files already in the database are only overwritten when CONTENT_RESEED=true,
  // so edits made in the Teacher area are not lost on restart.
  function seedContent(force = false) {
    const courses = JSON.parse(fs.readFileSync(path.join(CONTENT, 'courses.json'), 'utf8'));
    const upsert = db.prepare(`INSERT INTO content(id,kind,json,status,updated_at) VALUES(?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET json=excluded.json, status=excluded.status, updated_at=excluded.updated_at`);
    const insert = db.prepare('INSERT OR IGNORE INTO content(id,kind,json,status,updated_at) VALUES(?,?,?,?,?)');
    const put = force ? upsert : insert;
    put.run('courses', 'courses', JSON.stringify(courses), 'published', now());
    const dir = path.join(CONTENT, 'topics');
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const t = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      put.run('topic:' + t.id, 'topic', JSON.stringify(t), t.status === 'published' ? 'published' : 'draft', now());
    }
  }
  seedContent(env.CONTENT_RESEED === 'true');

  if (!db.prepare("SELECT 1 FROM users WHERE role='teacher'").get()) {
    if (env.TEACHER_PASSWORD) {
      db.prepare('INSERT INTO users(id,username,role,display,class,pass_hash,created_at) VALUES(?,?,?,?,?,?,?)')
        .run(A.newId(), (env.TEACHER_USERNAME || 'mrgarry').toLowerCase(), 'teacher', 'Mr Garry', null, A.hashSecret(env.TEACHER_PASSWORD), now());
    } else if (!opts.quiet) {
      console.warn('No teacher account exists. Set TEACHER_PASSWORD (and optionally TEACHER_USERNAME) and restart.');
    }
  }

  // ---------- helpers ----------
  const getContent = (id) => {
    const r = db.prepare('SELECT * FROM content WHERE id=?').get(id);
    return r ? { ...r, data: JSON.parse(r.json) } : null;
  };
  const findCourse = (cid) => getContent('courses').data.courses.find((c) => c.id === cid);
  const subRow = (r) => r && ({
    id: r.id, user_id: r.user_id, topic_id: r.topic_id, question_id: r.question_id, parent_id: r.parent_id,
    text: r.text, status: r.status, ai: r.ai_json ? JSON.parse(r.ai_json) : null, ai_error: r.ai_error,
    teacher: r.teacher_json ? JSON.parse(r.teacher_json) : null, created_at: r.created_at, updated_at: r.updated_at
  });
  const monthSpend = () => db.prepare("SELECT COALESCE(SUM(cost_usd),0) s FROM usage WHERE substr(at,1,7)=?").get(today().slice(0, 7)).s;

  function aiStatus() {
    const s = D.getSettings(db);
    const reasons = [];
    if (!env.ANTHROPIC_API_KEY) reasons.push('No AI provider key is configured on the server.');
    if (!s.ai_enabled) reasons.push('AI feedback is switched off by the teacher.');
    if (!(s.price_input_per_mtok > 0 && s.price_output_per_mtok > 0)) reasons.push('Token prices have not been entered in Teacher › Settings, so the spending ceiling cannot be enforced.');
    const spent = monthSpend();
    if (spent >= s.monthly_budget_usd) reasons.push('This month\'s AI budget has been reached.');
    return { available: reasons.length === 0, reasons, provider: 'Anthropic (Claude API)', model: s.ai_model, spent_usd: +spent.toFixed(4), budget_usd: s.monthly_budget_usd };
  }

  function exportStudent(uid) {
    const u = db.prepare('SELECT id, username, display, class, created_at FROM users WHERE id=?').get(uid);
    const p = db.prepare('SELECT json FROM progress WHERE user_id=?').get(uid);
    const subs = db.prepare('SELECT * FROM submissions WHERE user_id=? ORDER BY created_at').all(uid).map(subRow);
    return { exported_at: now(), user: u, progress: p ? JSON.parse(p.json) : null, submissions: subs };
  }

  // ---------- routes ----------
  const routes = [];
  const route = (method, pattern, role, fn) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    routes.push({ method, re, keys, role, fn });
  };

  route('GET', '/api/health', null, () => ({ ok: true }));
  route('GET', '/api/me', null, (req) => ({ user: req.user || null }));

  route('POST', '/api/login', null, (req, res) => {
    const { username, secret } = req.body || {};
    const key = (req.socket.remoteAddress || '') + '|' + String(username || '').toLowerCase();
    if (!A.loginAllowed(key)) throw new HttpError(429, 'Too many attempts. Wait 15 minutes and try again.');
    const u = db.prepare('SELECT * FROM users WHERE username=?').get(String(username || '').trim().toLowerCase());
    // Student codes are case-insensitive; the teacher password is exact.
    const given = u && u.role === 'student' ? String(secret || '').trim().toLowerCase() : String(secret || '');
    if (!u || !A.verifySecret(given, u.pass_hash)) {
      A.recordFailure(key);
      throw new HttpError(401, 'Username or code not recognised.');
    }
    const token = A.createSession(db, u.id);
    res.setHeader('Set-Cookie', `hub_session=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${30 * 86400}${cookieSecure ? '; Secure' : ''}`);
    return { user: { id: u.id, username: u.username, role: u.role, display: u.display, class: u.class } };
  });

  route('POST', '/api/logout', null, (req, res) => {
    A.destroySession(db, req.token);
    res.setHeader('Set-Cookie', 'hub_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0');
    return { ok: true };
  });

  // Content: students see published only.
  route('GET', '/api/catalog', 'any', (req) => {
    const courses = getContent('courses').data;
    const rows = db.prepare("SELECT id, status, json FROM content WHERE kind='topic'").all();
    const topics = {};
    for (const r of rows) {
      if (req.user.role !== 'teacher' && r.status !== 'published') continue;
      const t = JSON.parse(r.json);
      topics[t.id] = { id: t.id, course: t.course, area: t.area || null, kt: t.kt || null, order: t.order || 0, title: t.title, status: r.status, review: t.review };
    }
    return { courses, topics, ai: aiStatus() };
  });

  route('GET', '/api/topics/:id', 'any', (req) => {
    const t = getContent('topic:' + req.params.id);
    if (!t || (t.status !== 'published' && req.user.role !== 'teacher')) throw new HttpError(404, 'Topic not found.');
    const data = t.data;
    if (req.user.role !== 'teacher') {
      // Mark schemes are teacher material; students see success criteria only.
      data.exam.questions = data.exam.questions.map((q) => ({ ...q, markscheme: q.markscheme ? { verified: !!q.markscheme.verified, max_marks: q.markscheme.max_marks } : null }));
    }
    return { topic: data, status: t.status };
  });

  // Progress (own only)
  route('GET', '/api/progress', 'student', (req) => {
    const r = db.prepare('SELECT json, updated_at FROM progress WHERE user_id=?').get(req.user.id);
    return { progress: r ? JSON.parse(r.json) : {}, updated_at: r ? r.updated_at : null };
  });
  route('PUT', '/api/progress', 'student', (req) => {
    const p = req.body && req.body.progress;
    if (!p || typeof p !== 'object' || Array.isArray(p)) throw new HttpError(400, 'Invalid progress.');
    const json = JSON.stringify(p);
    if (json.length > 400000) throw new HttpError(413, 'Progress too large.');
    db.prepare(`INSERT INTO progress(user_id,json,updated_at) VALUES(?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at`).run(req.user.id, json, now());
    return { ok: true, updated_at: now() };
  });

  // Submissions (own only)
  route('GET', '/api/submissions', 'student', (req) => ({
    submissions: db.prepare('SELECT * FROM submissions WHERE user_id=? ORDER BY created_at DESC').all(req.user.id).map(subRow),
    ai: aiStatus()
  }));

  route('POST', '/api/submissions', 'student', (req) => {
    const { topic_id, question_id, text, parent_id } = req.body || {};
    const t = getContent('topic:' + topic_id);
    if (!t || t.status !== 'published') throw new HttpError(404, 'Topic not found.');
    if (!t.data.exam.questions.some((q) => q.id === question_id)) throw new HttpError(404, 'Question not found.');
    if (typeof text !== 'string' || !text.trim()) throw new HttpError(400, 'Write something first.');
    if (text.length > 30000) throw new HttpError(413, 'Response too long.');
    if (parent_id) {
      const p = db.prepare('SELECT * FROM submissions WHERE id=? AND user_id=?').get(parent_id, req.user.id);
      if (!p) throw new HttpError(404, 'Original response not found.');
    }
    const id = A.newId();
    db.prepare('INSERT INTO submissions(id,user_id,topic_id,question_id,parent_id,text,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)')
      .run(id, req.user.id, topic_id, question_id, parent_id || null, text, 'draft', now(), now());
    return { submission: subRow(db.prepare('SELECT * FROM submissions WHERE id=?').get(id)) };
  });

  const ownSub = (req) => {
    const r = db.prepare('SELECT * FROM submissions WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
    if (!r) throw new HttpError(404, 'Submission not found.');
    return r;
  };

  route('PUT', '/api/submissions/:id', 'student', (req) => {
    const r = ownSub(req);
    if (!['draft', 'error'].includes(r.status)) throw new HttpError(409, 'This answer has already been sent. Start a redraft instead.');
    const text = req.body && req.body.text;
    if (typeof text !== 'string' || text.length > 30000) throw new HttpError(400, 'Invalid text.');
    db.prepare("UPDATE submissions SET text=?, status='draft', updated_at=? WHERE id=?").run(text, now(), r.id);
    return { submission: subRow(db.prepare('SELECT * FROM submissions WHERE id=?').get(r.id)) };
  });

  route('POST', '/api/submissions/:id/submit', 'student', (req) => {
    const r = ownSub(req);
    if (r.status !== 'draft' && r.status !== 'error') throw new HttpError(409, 'This answer has already been sent.');
    db.prepare("UPDATE submissions SET status='submitted', updated_at=? WHERE id=?").run(now(), r.id);
    return { submission: subRow(db.prepare('SELECT * FROM submissions WHERE id=?').get(r.id)) };
  });

  route('DELETE', '/api/submissions/:id', 'student', (req) => {
    const r = ownSub(req);
    db.prepare('DELETE FROM submissions WHERE id=?').run(r.id);
    return { ok: true };
  });

  route('POST', '/api/submissions/:id/feedback', 'student', async (req) => {
    const r = ownSub(req);
    if (r.status === 'marked') throw new HttpError(409, 'Feedback already given. Start a redraft to get new feedback.');
    if (r.status === 'submitted') throw new HttpError(409, 'This answer was sent to your teacher. Start a redraft to get AI feedback.');
    if (r.status === 'marking') throw new HttpError(409, 'Feedback is already being prepared.');
    const s = D.getSettings(db);
    const st = aiStatus();
    if (!st.available) throw new HttpError(503, 'AI feedback is unavailable: ' + st.reasons.join(' ') + ' Your response is saved.');
    const n = words(r.text);
    if (n > s.max_words) throw new HttpError(413, `Your response is ${n} words; the limit for feedback is ${s.max_words}. Your draft is saved.`);
    if (n < 15) throw new HttpError(400, 'Write at least 15 words before asking for feedback.');
    const dayCount = db.prepare("SELECT COUNT(*) n FROM usage WHERE user_id=? AND substr(at,1,10)=?").get(req.user.id, today()).n;
    if (dayCount >= s.daily_marks_per_student) throw new HttpError(429, `You have used today's ${s.daily_marks_per_student} feedback requests. Your draft is saved — try again tomorrow.`);
    const last = db.prepare('SELECT at FROM usage WHERE user_id=? ORDER BY id DESC LIMIT 1').get(req.user.id);
    if (last && Date.now() - Date.parse(last.at) < s.cooldown_seconds * 1000) throw new HttpError(429, `Please wait ${s.cooldown_seconds} seconds between feedback requests.`);
    // Resubmission chain depth
    let depth = 0, cur = r, previous = null;
    if (r.parent_id) {
      const p = db.prepare('SELECT * FROM submissions WHERE id=?').get(r.parent_id);
      previous = p ? { text: p.text, ai: p.ai_json ? JSON.parse(p.ai_json) : null } : null;
    }
    while (cur && cur.parent_id) { depth++; cur = db.prepare('SELECT * FROM submissions WHERE id=?').get(cur.parent_id); }
    if (depth > s.max_resubmissions) throw new HttpError(429, `You have reached the redraft limit (${s.max_resubmissions}) for this question. Ask Mr Garry to review it.`);

    const topic = getContent('topic:' + r.topic_id).data;
    const course = findCourse(topic.course);
    const question = M.resolveQuestion(course, topic.exam.questions.find((q) => q.id === r.question_id));
    const prompt = M.buildPrompt({ course, topic, question, text: r.text, previous });

    const worst = (M.estimateTokens(prompt.system + prompt.user) * s.price_input_per_mtok + s.max_output_tokens * s.price_output_per_mtok) / 1e6;
    if (monthSpend() + reservedUsd + worst > s.monthly_budget_usd) throw new HttpError(503, 'The AI budget ceiling would be exceeded by this request, so it was not sent. Your draft is saved.');
    reservedUsd += worst;
    db.prepare("UPDATE submissions SET status='marking', ai_error=NULL, updated_at=? WHERE id=?").run(now(), r.id);
    try {
      const out = await provider({ apiKey: env.ANTHROPIC_API_KEY, baseUrl: env.AI_BASE_URL, model: s.ai_model, system: prompt.system, user: prompt.user, maxTokens: s.max_output_tokens });
      const inTok = out.usage.input_tokens || M.estimateTokens(prompt.system + prompt.user);
      const outTok = out.usage.output_tokens || s.max_output_tokens;
      const cost = (inTok * s.price_input_per_mtok + outTok * s.price_output_per_mtok) / 1e6;
      db.prepare('INSERT INTO usage(user_id,at,input_tokens,output_tokens,cost_usd) VALUES(?,?,?,?,?)').run(req.user.id, now(), inTok, outTok, cost);
      const fb = M.normalise(out.text, { text: r.text, question, hasMarkScheme: prompt.hasMarkScheme, isResubmission: !!previous });
      fb.provider = 'Anthropic'; fb.model = s.ai_model; fb.at = now();
      db.prepare("UPDATE submissions SET status='marked', ai_json=?, updated_at=? WHERE id=?").run(JSON.stringify(fb), now(), r.id);
    } catch (e) {
      db.prepare("UPDATE submissions SET status='error', ai_error=?, updated_at=? WHERE id=?").run(String(e.message || e).slice(0, 500), now(), r.id);
      throw new HttpError(502, 'Feedback could not be generated: ' + (e.message || e) + ' Your response is saved.');
    } finally { reservedUsd -= worst; }
    return { submission: subRow(db.prepare('SELECT * FROM submissions WHERE id=?').get(r.id)) };
  });

  route('GET', '/api/my-data', 'student', (req) => exportStudent(req.user.id));

  // ---------- teacher ----------
  route('GET', '/api/teacher/students', 'teacher', () => ({
    students: db.prepare(`SELECT u.id, u.username, u.display, u.class, u.created_at,
      (SELECT updated_at FROM progress p WHERE p.user_id=u.id) AS last_active,
      (SELECT COUNT(*) FROM submissions s WHERE s.user_id=u.id) AS submissions
      FROM users u WHERE role='student' ORDER BY class, username`).all()
  }));

  route('POST', '/api/teacher/students', 'teacher', (req) => {
    const list = Array.isArray(req.body && req.body.students) ? req.body.students : [];
    if (!list.length || list.length > 200) throw new HttpError(400, 'Provide 1–200 students.');
    const created = [];
    const ins = db.prepare('INSERT INTO users(id,username,role,display,class,pass_hash,created_at) VALUES(?,?,?,?,?,?,?)');
    for (const s of list) {
      const username = String(s.username || '').trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new HttpError(400, `Invalid username "${s.username}" — use 3–32 letters, numbers, dots or dashes.`);
      if (db.prepare('SELECT 1 FROM users WHERE username=?').get(username)) throw new HttpError(409, `Username "${username}" already exists.`);
      const code = A.accessCode();
      ins.run(A.newId(), username, 'student', String(s.display || '').slice(0, 40) || null, String(s.class || '').slice(0, 20) || null, A.hashSecret(code), now());
      created.push({ username, code, class: s.class || null });
    }
    return { created, note: 'Codes are shown once. Give each student their username and code.' };
  });

  route('POST', '/api/teacher/students/:id/reset-code', 'teacher', (req) => {
    const u = db.prepare("SELECT * FROM users WHERE id=? AND role='student'").get(req.params.id);
    if (!u) throw new HttpError(404, 'Student not found.');
    const code = A.accessCode();
    db.prepare('UPDATE users SET pass_hash=? WHERE id=?').run(A.hashSecret(code), u.id);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);
    return { username: u.username, code };
  });

  route('DELETE', '/api/teacher/students/:id', 'teacher', (req) => {
    const u = db.prepare("SELECT * FROM users WHERE id=? AND role='student'").get(req.params.id);
    if (!u) throw new HttpError(404, 'Student not found.');
    db.prepare('UPDATE usage SET user_id=NULL WHERE user_id=?').run(u.id); // keep spend totals, drop identity
    db.prepare('DELETE FROM users WHERE id=?').run(u.id); // cascades sessions, progress, submissions
    return { ok: true };
  });

  route('GET', '/api/teacher/students/:id/export', 'teacher', (req) => {
    if (!db.prepare("SELECT 1 FROM users WHERE id=? AND role='student'").get(req.params.id)) throw new HttpError(404, 'Student not found.');
    return exportStudent(req.params.id);
  });

  route('GET', '/api/teacher/progress', 'teacher', () => ({
    progress: db.prepare(`SELECT u.username, u.class, p.json, p.updated_at FROM progress p JOIN users u ON u.id=p.user_id`).all()
      .map((r) => ({ username: r.username, class: r.class, updated_at: r.updated_at, progress: JSON.parse(r.json) }))
  }));

  route('GET', '/api/teacher/submissions', 'teacher', (req) => ({
    submissions: db.prepare(`SELECT s.*, u.username, u.class FROM submissions s JOIN users u ON u.id=s.user_id
      WHERE s.status != 'draft' ORDER BY s.updated_at DESC LIMIT 500`).all().map((r) => ({ ...subRow(r), username: r.username, class: r.class }))
  }));

  route('PUT', '/api/teacher/submissions/:id/review', 'teacher', (req) => {
    const r = db.prepare('SELECT * FROM submissions WHERE id=?').get(req.params.id);
    if (!r) throw new HttpError(404, 'Submission not found.');
    const b = req.body || {};
    const review = {
      mark: b.mark === '' || b.mark == null ? null : Number(b.mark),
      max: b.max == null || b.max === '' ? null : Number(b.max),
      level: b.level || null,
      comment: String(b.comment || '').slice(0, 5000),
      overrides_ai: !!b.overrides_ai,
      reviewed_at: now(),
      reviewer: req.user.username
    };
    db.prepare('UPDATE submissions SET teacher_json=?, updated_at=? WHERE id=?').run(JSON.stringify(review), now(), r.id);
    return { submission: subRow(db.prepare('SELECT * FROM submissions WHERE id=?').get(r.id)) };
  });

  route('GET', '/api/teacher/settings', 'teacher', () => ({ settings: D.getSettings(db), ai: aiStatus() }));
  route('PUT', '/api/teacher/settings', 'teacher', (req) => {
    const b = req.body || {};
    const patch = {};
    const num = (k, min, max) => { if (k in b) { const v = b[k] === null || b[k] === '' ? null : Number(b[k]); if (v !== null && (!Number.isFinite(v) || v < min || v > max)) throw new HttpError(400, `Invalid ${k}.`); patch[k] = v; } };
    num('price_input_per_mtok', 0, 1000); num('price_output_per_mtok', 0, 1000); num('monthly_budget_usd', 0, 10000);
    num('max_output_tokens', 200, 8000); num('max_words', 50, 5000); num('daily_marks_per_student', 0, 100);
    num('cooldown_seconds', 0, 3600); num('max_resubmissions', 0, 10);
    if ('ai_enabled' in b) patch.ai_enabled = !!b.ai_enabled;
    if ('ai_model' in b) { if (!/^[a-z0-9.-]{3,80}$/.test(b.ai_model)) throw new HttpError(400, 'Invalid model id.'); patch.ai_model = b.ai_model; }
    return { settings: D.setSettings(db, patch), ai: aiStatus() };
  });

  route('GET', '/api/teacher/usage', 'teacher', () => ({
    month_usd: monthSpend(),
    by_day: db.prepare("SELECT substr(at,1,10) day, COUNT(*) requests, SUM(cost_usd) usd FROM usage GROUP BY day ORDER BY day DESC LIMIT 60").all(),
    ai: aiStatus()
  }));

  route('GET', '/api/teacher/content', 'teacher', () => ({
    items: db.prepare('SELECT id, kind, status, updated_at FROM content ORDER BY id').all()
  }));
  route('GET', '/api/teacher/content/:id', 'teacher', (req) => {
    const c = getContent(decodeURIComponent(req.params.id));
    if (!c) throw new HttpError(404, 'Not found.');
    return { id: c.id, kind: c.kind, status: c.status, data: c.data };
  });
  route('PUT', '/api/teacher/content/:id', 'teacher', (req) => {
    const id = decodeURIComponent(req.params.id);
    const { data, status } = req.body || {};
    if (!['draft', 'published'].includes(status)) throw new HttpError(400, 'Status must be draft or published.');
    let kind;
    if (id === 'courses') { kind = 'courses'; if (!data || !Array.isArray(data.courses)) throw new HttpError(400, 'Courses must contain a "courses" array.'); }
    else if (/^topic:[a-z0-9-]+$/.test(id)) {
      kind = 'topic';
      for (const k of ['id', 'course', 'title', 'learn', 'quizzes', 'flashcards', 'checklist', 'exam']) if (!data || !(k in data)) throw new HttpError(400, `Topic is missing "${k}".`);
      if ('topic:' + data.id !== id) throw new HttpError(400, 'Topic id does not match.');
      for (const q of data.exam.questions || []) {
        if (q.markscheme && q.markscheme.verified && !Number.isFinite(q.markscheme.max_marks)) throw new HttpError(400, `Question ${q.id}: a verified mark scheme needs max_marks.`);
      }
    } else throw new HttpError(400, 'Invalid content id.');
    db.prepare(`INSERT INTO content(id,kind,json,status,updated_at) VALUES(?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET json=excluded.json, status=excluded.status, updated_at=excluded.updated_at`).run(id, kind, JSON.stringify(data), status, now());
    return { ok: true };
  });

  route('GET', '/api/teacher/backup', 'teacher', () => ({
    format: 'history-hub-backup', version: 1, created_at: now(),
    users: db.prepare('SELECT * FROM users').all(),
    content: db.prepare('SELECT * FROM content').all(),
    progress: db.prepare('SELECT * FROM progress').all(),
    submissions: db.prepare('SELECT * FROM submissions').all(),
    usage: db.prepare('SELECT * FROM usage').all(),
    settings: db.prepare('SELECT * FROM settings').all()
  }));

  route('POST', '/api/teacher/restore', 'teacher', (req) => {
    const b = req.body || {};
    if (b.format !== 'history-hub-backup' || b.version !== 1) throw new HttpError(400, 'Not a Revision Hub backup file.');
    if (!(b.users || []).some((u) => u.role === 'teacher')) throw new HttpError(400, 'Backup contains no teacher account; refusing to restore.');
    const tables = { users: ['id', 'username', 'role', 'display', 'class', 'pass_hash', 'created_at'], content: ['id', 'kind', 'json', 'status', 'updated_at'], progress: ['user_id', 'json', 'updated_at'], submissions: ['id', 'user_id', 'topic_id', 'question_id', 'parent_id', 'text', 'status', 'ai_json', 'ai_error', 'teacher_json', 'created_at', 'updated_at'], usage: ['id', 'user_id', 'at', 'input_tokens', 'output_tokens', 'cost_usd'], settings: ['key', 'value'] };
    db.exec('BEGIN');
    try {
      for (const t of ['sessions', 'usage', 'submissions', 'progress', 'content', 'settings', 'users']) db.exec(`DELETE FROM ${t}`);
      for (const [t, cols] of Object.entries(tables)) {
        const stmt = db.prepare(`INSERT INTO ${t}(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`);
        for (const row of b[t] || []) stmt.run(...cols.map((c) => (row[c] === undefined ? null : row[c])));
      }
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw new HttpError(400, 'Restore failed and nothing was changed: ' + e.message); }
    return { ok: true, note: 'Restored. Everyone, including you, must sign in again.' };
  });

  route('POST', '/api/teacher/password', 'teacher', (req) => {
    const { current, next } = req.body || {};
    const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
    if (!A.verifySecret(String(current || ''), u.pass_hash)) throw new HttpError(401, 'Current password is wrong.');
    if (String(next || '').length < 10) throw new HttpError(400, 'Use at least 10 characters.');
    db.prepare('UPDATE users SET pass_hash=? WHERE id=?').run(A.hashSecret(next), u.id);
    return { ok: true };
  });

  // ---------- http plumbing ----------
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };

  function security(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0; const chunks = [];
      req.on('data', (c) => { size += c.length; if (size > MAX_BODY * 10) { reject(new HttpError(413, 'Request too large.')); req.destroy(); } else chunks.push(c); });
      req.on('end', () => {
        if (!chunks.length) return resolve({});
        const raw = Buffer.concat(chunks).toString('utf8');
        if (raw.length > MAX_BODY && !req.url.startsWith('/api/teacher/restore')) return reject(new HttpError(413, 'Request too large.'));
        try { resolve(JSON.parse(raw)); } catch { reject(new HttpError(400, 'Invalid JSON.')); }
      });
      req.on('error', reject);
    });
  }

  async function handle(req, res) {
    security(res);
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      try {
        const cookie = Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((x) => x[0]));
        req.token = cookie.hub_session;
        req.user = A.userFromToken(db, req.token);
        if (req.method !== 'GET' && req.headers['x-hub'] !== '1') throw new HttpError(403, 'Missing request header.'); // CSRF guard
        const r = routes.find((x) => x.method === req.method && x.re.test(url.pathname));
        if (!r) throw new HttpError(404, 'Not found.');
        if (r.role) {
          if (!req.user) throw new HttpError(401, 'Please sign in.');
          if (r.role !== 'any' && req.user.role !== r.role) throw new HttpError(403, 'You do not have access to this.');
        }
        const m = url.pathname.match(r.re);
        req.params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
        req.query = Object.fromEntries(url.searchParams);
        req.body = req.method === 'GET' ? {} : await readBody(req);
        const out = await r.fn(req, res);
        res.statusCode = 200; res.end(JSON.stringify(out));
      } catch (e) {
        res.statusCode = e.status || 500;
        if (!e.status) console.error(e);
        res.end(JSON.stringify({ error: e.status ? e.message : 'Server error.' }));
      }
      return;
    }
    // static files
    let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    if (!p) p = 'index.html';
    const file = path.join(PUBLIC, p);
    if (!file.startsWith(PUBLIC)) { res.statusCode = 403; return res.end(); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.statusCode = 404; return res.end('Not found'); }
      res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.end(buf);
    });
  }

  const server = http.createServer((req, res) => { handle(req, res); });
  return { server, db, seedContent };
}

module.exports = { createApp };
