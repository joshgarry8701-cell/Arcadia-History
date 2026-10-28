/* Arcadia British School History Department website — client.
   Runs in two modes:
   - server mode (normal website): talks to /api, sign-in required, progress saved on the server.
   - preview mode (window.HUB_PREVIEW set): content bundled in the page, progress saved in this browser only,
     no sign-in, no teacher tools, no AI feedback. */
(() => {
'use strict';
const PREVIEW = !!window.HUB_PREVIEW;
const root = document.getElementById('app');

// ---------- tiny templating with escaping ----------
class Raw { constructor(s) { this.s = s; } }
const raw = (s) => new Raw(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (v) => v instanceof Raw ? v.s : Array.isArray(v) ? v.map(fmt).join('') : (v == null || v === false) ? '' : esc(v);
function html(strings, ...vals) { let o = ''; strings.forEach((s, i) => { o += s; if (i < vals.length) o += fmt(vals[i]); }); return raw(o); }
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const today = () => new Date().toISOString().slice(0, 10);
const pct = (r, w) => (r + w ? Math.round((100 * r) / (r + w)) : null);
const wordsIn = (t) => (String(t).trim().match(/\S+/g) || []).length;
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

// ---------- data stores ----------
function ApiStore() {
  const call = async (method, url, body) => {
    const r = await fetch(url, { method, credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-hub': '1' }, body: body === undefined ? undefined : JSON.stringify(body) });
    let j = {}; try { j = await r.json(); } catch {}
    if (!r.ok) { const e = new Error(j.error || `Request failed (${r.status})`); e.status = r.status; throw e; }
    return j;
  };
  return {
    call,
    me: async () => (await call('GET', '/api/me')).user,
    login: async (u, s) => (await call('POST', '/api/login', { username: u, secret: s })).user,
    logout: () => call('POST', '/api/logout'),
    catalog: () => call('GET', '/api/catalog'),
    topic: async (id) => (await call('GET', '/api/topics/' + id)).topic,
    loadProgress: async () => (await call('GET', '/api/progress')).progress,
    saveProgress: (p) => call('PUT', '/api/progress', { progress: p }),
    submissions: () => call('GET', '/api/submissions'),
    submitSub: async (id) => (await call('POST', '/api/submissions/' + id + '/submit')).submission,
    createSub: async (b) => (await call('POST', '/api/submissions', b)).submission,
    updateSub: async (id, text) => (await call('PUT', '/api/submissions/' + id, { text })).submission,
    feedback: async (id) => (await call('POST', '/api/submissions/' + id + '/feedback')).submission,
    deleteSub: (id) => call('DELETE', '/api/submissions/' + id),
    myData: () => call('GET', '/api/my-data')
  };
}

function LocalStore() {
  const H = window.HUB_PREVIEW;
  const AI_REASON = H.note ? 'AI feedback is not switched on for this version of the site. Use the guide, frame and model to check your own answer, then share it with Mr Garry.' : 'AI feedback is not part of this preview. It works on the full website once a school API key is added.';
  const subs = () => lsGet('hub-preview-subs', []);
  const putSubs = (s) => { if (!lsSet('hub-preview-subs', s)) throw new Error('This browser blocked saving, so your writing was not saved. Copy it somewhere safe.'); };
  return {
    me: async () => ({ id: 'preview', username: 'preview', role: 'student', display: 'Preview' }),
    login: async () => { throw new Error('Sign-in is not available in the preview.'); },
    logout: async () => {},
    catalog: async () => {
      const topics = {};
      for (const t of Object.values(H.topics)) topics[t.id] = { id: t.id, course: t.course, area: t.area || null, kt: t.kt || null, order: t.order || 0, title: t.title, status: 'published', review: t.review };
      return { courses: H.courses, topics, ai: { available: false, reasons: [AI_REASON] } };
    },
    topic: async (id) => JSON.parse(JSON.stringify(H.topics[id])),
    loadProgress: async () => lsGet('hub-preview-progress', {}),
    saveProgress: async (p) => { if (!lsSet('hub-preview-progress', p)) throw new Error('Browser storage is blocked'); return { ok: true }; },
    submissions: async () => ({ submissions: subs(), ai: { available: false, reasons: [AI_REASON] } }),
    createSub: async (b) => { const s = { id: 'p' + Date.now(), status: 'draft', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ai: null, teacher: null, ...b }; putSubs([s, ...subs()]); return s; },
    updateSub: async (id, text) => { const all = subs(); const s = all.find((x) => x.id === id); s.text = text; s.updated_at = new Date().toISOString(); putSubs(all); return s; },
    feedback: async () => { throw new Error(AI_REASON + ' Your writing is saved in this browser.'); },
    submitSub: async () => { throw new Error('Sending work to Mr Garry needs the full website. Your writing is saved in this browser.'); },
    deleteSub: async (id) => { putSubs(subs().filter((x) => x.id !== id)); },
    myData: async () => ({ exported_at: new Date().toISOString(), progress: lsGet('hub-preview-progress', {}), submissions: subs() })
  };
}

const Store = PREVIEW ? LocalStore() : ApiStore();
const PHOTO = (window.HUB_PREVIEW && window.HUB_PREVIEW.photo) || 'mr-garry.webp';
const BADGE = (window.HUB_PREVIEW && window.HUB_PREVIEW.badge) || 'arcadia-badge.png';
const KELSEY_PHOTO = 'https://arcadia.sch.ae/assets/images/teachers/kelsey_daigault.webp';
const SITE_NAME = 'Arcadia British School History Department';

// ---------- state ----------
const S = { user: null, catalog: null, topics: {}, progress: {}, subs: null, ai: null, ui: {}, save: 'saved', teacher: {} };

// ---------- progress ----------
function P(path, init) { // get-or-create nested object in progress
  let o = S.progress;
  for (const k of path) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
  return o;
}
function daily() {
  const d = S.progress.daily;
  if (!d || d.date !== today()) S.progress.daily = { date: today(), cards: 0, answers: 0 };
  return S.progress.daily;
}
let saveTimer = null;
function persist() {
  if (S.user && S.user.role === 'teacher') return;
  S.save = 'pending'; paintSave();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    S.save = 'saving'; paintSave();
    try { await Store.saveProgress(S.progress); S.save = 'saved'; }
    catch (e) { S.save = 'error'; S.saveError = e.message; setTimeout(persist, 10000); }
    paintSave();
  }, 700);
}
function paintSave() {
  const el = document.getElementById('savestate'); if (!el) return;
  const map = { saved: PREVIEW ? 'Saved in this browser' : 'Progress saved', pending: 'Saving…', saving: 'Saving…', error: 'Not saved — retrying' };
  el.textContent = map[S.save] || '';
  el.className = 'small hide-sm ' + (S.save === 'error' ? '' : 'muted');
  el.style.color = S.save === 'error' ? 'var(--red)' : '';
}
window.addEventListener('beforeunload', (e) => { if (S.save === 'pending' || S.save === 'saving') { e.preventDefault(); e.returnValue = ''; } });

// Leitner-style scheduling (days until next review per box)
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
function cardState(tid, cid) { return P(['flash', tid])[cid] || null; }
function setCard(tid, cid, patch) { const f = P(['flash', tid]); f[cid] = { box: 0, due: 0, got: 0, miss: 0, pinned: false, ...(f[cid] || {}), ...patch }; persist(); }
function isDue(st) { return !st || !st.seen || st.due <= Date.now(); }

function recordAnswer(tid, id, ok) {
  const q = P(['quiz', tid]);
  const r = q[id] || { r: 0, w: 0 };
  ok ? r.r++ : r.w++;
  r.last = ok ? 1 : 0; r.at = Date.now();
  q[id] = r; daily().answers++; persist();
}
function sectionAccuracy(t, sid) {
  const q = (S.progress.quiz || {})[t.id] || {};
  let r = 0, w = 0;
  const all = [...t.quizzes.mcq, ...t.quizzes.short, ...t.quizzes.evidence];
  for (const it of all) if (it.s === sid && q[it.id]) { r += q[it.id].r; w += q[it.id].w; }
  return { r, w, p: pct(r, w) };
}
function topicStats(t) {
  const q = (S.progress.quiz || {})[t.id] || {};
  let r = 0, w = 0; for (const v of Object.values(q)) { r += v.r; w += v.w; }
  const f = (S.progress.flash || {})[t.id] || {};
  const mastered = t.flashcards.filter((c) => f[c.id] && f[c.id].box >= 3).length;
  const due = t.flashcards.filter((c) => isDue(f[c.id])).length;
  const ck = (S.progress.check || {})[t.id] || {};
  const rag = { red: 0, amber: 0, green: 0 }; for (const v of Object.values(ck)) if (rag[v] != null) rag[v]++;
  return { quiz: pct(r, w), answered: r + w, mastered, due, cards: t.flashcards.length, rag, rated: rag.red + rag.amber + rag.green };
}
function recommendations(t) {
  const ck = (S.progress.check || {})[t.id] || {};
  const out = [];
  for (const k of t.checklist) {
    const conf = ck[k.id];
    const acc = k.sections.map((s) => sectionAccuracy(t, s)).reduce((a, b) => ({ r: a.r + b.r, w: a.w + b.w }), { r: 0, w: 0 });
    const p = pct(acc.r, acc.w);
    let score = 0, why = '';
    if (conf === 'red') { score += 3; why = 'you rated it red'; }
    else if (conf === 'amber') { score += 2; why = 'you rated it amber'; }
    else if (!conf) { score += 1; why = 'not rated yet'; }
    if (p !== null && p < 60) { score += 2; why += (why ? ' and ' : '') + `quiz accuracy is ${p}%`; }
    if (conf === 'green' && p !== null && p < 60) why = `rated green, but quiz accuracy is only ${p}% — check it`;
    if (score >= 2 || (conf === 'green' && p !== null && p < 60)) out.push({ k, score, why });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 3);
}

// ---------- answer matching ----------
function norm(s) {
  return String(s).toLowerCase().replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(the|a|an) /, '');
}
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
function shortMatch(given, accept) {
  const g = norm(given); if (!g) return false;
  return accept.some((a) => { const n = norm(a); const tol = n.length <= 4 ? 0 : n.length <= 7 ? 1 : 2; return g === n || lev(g, n) <= tol || (n.length > 3 && (` ${g} `).includes(` ${n} `)); });
}

// ---------- routing ----------
function parseRoute() {
  const h = decodeURIComponent(location.hash.replace(/^#/, ''));
  const parts = h.split('.').filter(Boolean);
  return { parts, a: parts[0] || '', b: parts[1] || '', c: parts[2] || '' };
}
function go(token) { if (('#' + token) === location.hash || (!token && !location.hash)) render(); else location.hash = token; }
window.addEventListener('hashchange', () => { S.ui.scrollTop = true; render(); });

// ---------- icons ----------
const ICON = {
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  moon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  user: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  mark: '<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><rect x="1" y="1" width="32" height="32" rx="8" fill="var(--accent)"/><path d="M9 25V10l8 9 8-9v15" fill="none" stroke="var(--accent-ink)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><path d="M9 27h16" stroke="var(--accent-ink)" stroke-width="1.6" stroke-linecap="round" opacity=".7"/></svg>'
};

// ---------- shell ----------
function shell(inner, opts = {}) {
  const u = S.user;
  return html`
  <header class="bar"><div class="bar-in">
    <button class="brand" data-act="go" data-to="" aria-label="Home"><img class="badge" src="${BADGE}" alt="" width="34" height="36"><div><span>Arcadia British School<i class="hide-sm"> · Dubai</i></span><b>History Department</b></div></button>
    <span id="savestate" class="small muted hide-sm" aria-live="polite"></span>
    ${u ? html`<button class="iconbtn" data-act="search" aria-label="Search (press /)">${raw(ICON.search)}<span class="hide-sm">Search</span></button>` : ''}
    <button class="iconbtn" data-act="theme" aria-label="Switch light or dark mode">${raw(ICON.moon)}</button>
    ${u && !PREVIEW ? html`<button class="iconbtn" data-act="go" data-to="${u.role === 'teacher' ? 'teacher' : 'account'}" aria-label="${u.role === 'teacher' ? 'Teacher area' : 'My account'}">${raw(ICON.user)}<span class="hide-sm">${u.role === 'teacher' ? 'Teacher' : u.username}</span></button>` : ''}
    ${PREVIEW ? html`<button class="iconbtn" data-act="go" data-to="account" aria-label="Preview settings">${raw(ICON.user)}<span class="hide-sm">Preview</span></button>` : ''}
  </div></header>
  <main id="main" tabindex="-1">
    ${PREVIEW && !opts.noPreviewNote ? html`<div class="notice info">${(window.HUB_PREVIEW && window.HUB_PREVIEW.note) || 'Preview: everything works here except sign-in, teacher tools and AI feedback. Your progress is saved in this browser only.'}</div>` : ''}
    ${inner}
  </main>`;
}
function crumbs(list) {
  return html`<nav class="crumbs" aria-label="Breadcrumb"><button data-act="go" data-to="">Home</button>${list.map((c) => html`<span aria-hidden="true">›</span>${c.to != null ? html`<button data-act="go" data-to="${c.to}">${c.label}</button>` : html`<span>${c.label}</span>`}`)}</nav>`;
}
const courseOf = (id) => S.catalog.courses.courses.find((c) => c.id === id);
const yearNum = (c) => c.year.replace(/\D/g, '');

// ---------- views: login / home / course ----------
function viewLogin(err) {
  return html`<header class="bar"><div class="bar-in"><span class="brand"><img class="badge" src="${BADGE}" alt="" width="34" height="36"><div><span>Arcadia British School<i class="hide-sm"> · Dubai</i></span><b>History Department</b></div></span><button class="iconbtn" data-act="theme" aria-label="Switch light or dark mode">${raw(ICON.moon)}</button></div></header>
  <main><form class="panel login" id="loginform">
    <h1>Sign in</h1>
    <p class="muted">Use the username and code Mr Garry gave you.</p>
    <label for="lu">Username<input type="text" id="lu" autocomplete="username" required autocapitalize="none" spellcheck="false"></label>
    <label for="ls">Code or password<input type="password" id="ls" autocomplete="current-password" required></label>
    ${err ? html`<div class="notice bad" role="alert">${err}</div>` : ''}
    <button class="btn primary" type="submit">Sign in</button>
    <p class="small muted">Lost your code? Ask Mr Garry to reset it.</p>
  </form></main>`;
}

function viewHome() {
  const cs = S.catalog.courses.courses;
  return shell(html`
    <section class="hero dept-hero">
      <img class="dept-badge" src="${BADGE}" alt="Arcadia British School badge" width="92" height="96">
      <div>
        <p class="eyebrow">Arcadia British School · History Department</p>
        <h1>Choose your year</h1>
        <p>Learn the content, test your memory, practise your writing and act on feedback — from Key Stage 3 to International A Level.</p>
      </div>
    </section>
    <section class="team" aria-label="Our History teachers">
      <figure class="member"><img class="teacher" src="${KELSEY_PHOTO}" alt="Mrs Kelsey Daignault" width="104" height="104" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'teacher initials',textContent:'KD'}))"><figcaption><b>Mrs Kelsey Daignault</b><span>Head of History</span></figcaption></figure>
      <figure class="member"><img class="teacher" src="${PHOTO}" alt="Mr Joshua Garry" width="104" height="104"><figcaption><b>Mr Joshua Garry</b><span>History Teacher (A Level) · Exceptional Learners Lead</span></figcaption></figure>
    </section>
    <section class="years" aria-label="Year groups">
      ${cs.map((c) => {
        const built = Object.values(S.catalog.topics).filter((t) => t.course === c.id).length;
        return html`<button class="year" style="--course:${c.accent}" data-act="go" data-to="${c.id}">
          <span class="num">${yearNum(c)}</span>
          <h3>${c.title}</h3>
          <span class="enq">${c.enquiry}</span>
          ${built ? html`<span class="chip ok">${built} topic${built > 1 ? 's' : ''} ready</span>` : html`<span class="chip warn">Coming soon</span>`}
        </button>`;
      })}
    </section>
  `);
}

function topicCard(t) {
  const full = S.topics[t.id]; const st = full ? topicStats(full) : null;
  return html`<button class="act" data-act="go" data-to="${t.id}"><span class="eyebrow">${t.kt || 'Topic'}</span><b>${t.title}</b>
    ${t.status !== 'published' ? html`<span class="chip warn">Draft — students cannot see this</span>` : ''}
    ${st ? html`<span class="small muted">${st.mastered}/${st.cards} cards mastered · quiz ${st.quiz == null ? '—' : st.quiz + '%'}</span><div class="meter" aria-hidden="true"><i style="width:${st.cards ? Math.round(100 * st.mastered / st.cards) : 0}%"></i></div>` : ''}
  </button>`;
}
const courseTopics = (c) => Object.values(S.catalog.topics).filter((t) => t.course === c.id).sort((a, b) => (a.order || 0) - (b.order || 0) || a.id.localeCompare(b.id));
function viewCourse(c) {
  const topics = courseTopics(c);
  const ex = c.exam;
  const areas = c.areas && c.areas.length ? c.areas : [{ id: null, title: null }];
  const isT = S.user.role === 'teacher';
  return shell(html`
    ${crumbs([{ label: c.year }])}
    <section class="course-head" style="--course:${c.accent}">
      <p class="eyebrow">${c.year} · ${c.stage}</p>
      <h1>${c.title}</h1>
      <p class="muted">${c.enquiry}</p>
    </section>
    <div style="--course:${c.accent}; display:grid; gap:18px; min-width:0">
    ${topics.length ? html`<section class="acts">
      ${c.qtypes ? html`<button class="act" data-act="go" data-to="${c.id}.guide"><span class="eyebrow">Exam</span><b>Exam guide</b><span class="small muted">Every question type: what to do, timings, mark scheme levels, frames and models</span></button>` : ''}
      ${c.qtypes && !isKS3(c) ? html`<button class="act" data-act="go" data-to="${c.id}.past"><span class="eyebrow">Exam</span><b>Past papers</b><span class="small muted">Every past-paper question with mark scheme points and examiner comments</span></button>` : ''}
      ${isKS3(c) ? html`<button class="act" data-act="go" data-to="${c.id}.games"><span class="eyebrow">Games</span><b>🎮 Games arcade</b><span class="small muted">Play games mixing every ${c.year} topic and earn XP</span></button>` : ''}
      <button class="act" data-act="go" data-to="${c.id}.mixed"><span class="eyebrow">Retrieval</span><b>Mixed quiz</b><span class="small muted">Questions from every topic in this course</span></button>
      <button class="act" data-act="go" data-to="${c.id}.dates"><span class="eyebrow">Retrieval</span><b>Key dates quiz</b><span class="small muted">Match events and dates from the timelines</span></button>
    </section>` : ''}
    ${topics.length ? areas.map((a) => {
      const list = topics.filter((t) => !a.id || t.area === a.id);
      return html`<section style="display:grid;gap:10px">${a.title ? html`<div><p class="eyebrow">${a.paper || ''}</p><h2>${a.title}</h2></div>` : ''}
        ${list.length ? html`<div class="acts">${list.map(topicCard)}</div>` : html`<div class="notice">Topics for this part of the course are being prepared.</div>`}</section>`;
    }) : html`<div class="notice">Revision topics for this course are being prepared. They will appear here once Mr Garry has added the course resources.</div>`}
    ${ex ? html`<section class="panel"><h2>About the exam</h2>
      ${ex.verified ? '' : html`<div class="notice">These details have not yet been checked against the official specification.</div>`}
      <div class="scroll-x"><table class="data"><tbody>
        <tr><th scope="row">Exam board</th><td>${ex.board}</td></tr>
        <tr><th scope="row">Qualification</th><td>${ex.qualification}${ex.codes ? html`<br><span class="small muted">${ex.codes}</span>` : ''}</td></tr>
        <tr><th scope="row">Specification</th><td>${ex.specification_version || html`<span class="muted">To be confirmed</span>`}</td></tr>
        ${(ex.papers || []).map((pp) => html`<tr><th scope="row">${pp.title}</th><td>${pp.duration} · ${pp.marks} marks${pp.weighting ? ' · ' + pp.weighting : ''}<br><span class="small">${pp.structure}</span></td></tr>`)}
      </tbody></table></div>
      ${ex.aos ? html`<details class="fold"><summary>Assessment objectives</summary><div><ul>${ex.aos.map((a) => html`<li><b>${a.ao}</b> (${a.weight}): ${a.text}</li>`)}</ul></div></details>` : ''}
      ${ex.themes ? html`<details class="fold"><summary>The five themes</summary><div><ol>${ex.themes.map((x) => html`<li>${x}</li>`)}</ol></div></details>` : ''}
      ${ex.source_focus ? html`<details class="fold"><summary>${ex.source_focus.title}</summary><div><ul>${ex.source_focus.items.map((x) => html`<li>${x}</li>`)}</ul></div></details>` : ''}
      ${c.separation_note ? html`<p class="small muted">${c.separation_note}</p>` : ''}
      <details class="fold"><summary>Where these details come from</summary><div><ul>${(ex.sources || []).map((x) => html`<li>${x.url ? html`<a href="${x.url}" target="_blank" rel="noopener">${x.title}</a>` : x.title}${x.note ? html` <span class="muted">— ${x.note}</span>` : ''}</li>`)}</ul></div></details>
    </section>` : ''}
    ${isT && ex && (ex.conflicts || ex.open_questions) ? html`<section class="panel"><h2>For Mr Garry: to check</h2>
      ${ex.conflicts ? html`<h3>Conflicts found in the documents</h3><ul>${ex.conflicts.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
      ${ex.open_questions && ex.open_questions.length ? html`<h3>Open questions</h3><ul>${ex.open_questions.map((x) => html`<li>${x}</li>`)}</ul>` : ''}</section>` : ''}
    ${isT ? html`<section class="panel"><h2>Resources</h2>${c.resources_received && c.resources_received.length ? html`<p class="small"><b>Received:</b> ${c.resources_received.join('; ')}</p>` : ''}<h3>Still needed</h3><ul>${c.resources_needed.map((r) => html`<li>${r}</li>`)}</ul>${c.assessment ? html`<p class="small muted">${c.assessment.notes}</p>` : ''}</section>` : ''}
    </div>
  `);
}

// ---------- question types and exam guide ----------
function resolveQ(course, q) {
  const base = (q && q.qtype && course && course.qtypes && course.qtypes[q.qtype]) || {};
  const out = { ...base };
  for (const [k, v] of Object.entries(q || {})) if (v !== null && v !== undefined) out[k] = v;
  if (q && q.markscheme === undefined && base.markscheme) out.markscheme = base.markscheme;
  if (!out.frames && out.frame) out.frames = [{ name: 'Writing frame', full: out.frame.full, some: out.frame.some }];
  if (q && q.model && q.model.length) out.model_note = q.model_note || null;
  return out;
}
function levelsTable(ms) {
  if (!ms || !ms.levels || !ms.levels.length) return '';
  return html`<div class="scroll-x"><table class="data levels"><thead><tr><th>Level</th><th>Marks</th><th>Descriptor</th></tr></thead><tbody>${ms.levels.map((l) => html`<tr><td>${l.level}</td><td class="mono">${l.marks}</td><td>${l.descriptor}</td></tr>`)}</tbody></table></div>
    ${ms.notes ? html`<p class="small">${ms.notes}</p>` : ''}
    <p class="small muted">${ms.verified ? 'Checked by Mr Garry. ' : 'Mr Garry is checking this wording against the official mark scheme. '}Source: ${ms.source || '—'}</p>`;
}
function modelBlock(q) {
  if (!q.model || !q.model.length) return '';
  return html`<div class="model">${q.model.map((m) => html`<div class="seg"><p>${m.t}</p><em>${m.n}</em></div>`)}${q.model_note ? html`<p class="small muted">${q.model_note}</p>` : html`<p class="small muted">An example, not the only way to answer.</p>`}</div>`;
}
const shortQT = (c, k) => { const l = ((c.qtypes || {})[k] || {}).label || k; return l.split(' — ')[1] || l; };
const SERIES_M = { January: 1, May: 5, June: 6, October: 10, November: 11 };
const seriesKey = (s) => { if (!s || s === 'Specimen') return 0; const [m, y] = s.split(' '); return +y * 100 + (SERIES_M[m] || 0); };
const ppOrder = (a, b) => seriesKey(b.pp.series) - seriesKey(a.pp.series) || String(a.pp.part).localeCompare(String(b.pp.part));
const oneLine = (s, n = 230) => { const t = String(s).replace(/\n/g, ' ').replace(/\s+/g, ' '); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const PEARSON_PP = 'https://qualifications.pearson.com/en/support/support-topics/exams/past-papers.html';
function srcPanel(q, c) {
  const caps = q.src_captions || [];
  const bk = q.pp && q.pp.booklet;
  const ial = /^WHI/.test((q.pp && q.pp.paper) || '');
  const where = bk ? html`<p><a class="btn sm" href="${bk}" target="_blank" rel="noopener">Open the paper with the full ${caps.some((x) => /^Source/.test(x)) ? 'sources' : 'extract'} (PDF)</a></p>`
    : q.pp && ial ? html`<p class="small">Pearson publishes the sources booklet for this paper free on its <a href="${PEARSON_PP}" target="_blank" rel="noopener">past papers page</a> (choose International Advanced Level, History, ${q.pp.series}). Or ask Mr Garry for a copy.</p>`
    : q.pp ? html`<p class="small">Ask Mr Garry for the booklet for this paper.</p>` : '';
  return html`<section class="panel"><h2>Sources for this question</h2>
    ${caps.length ? html`<ul class="caps">${caps.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
    ${where}
    <p class="small muted">${caps.length ? 'These are the captions printed in the paper. The texts themselves' : 'The sources or extracts'} are not copied onto this site because they are still in copyright. Read them in the paper, then write your answer here. AI feedback can comment on structure${caps.length ? ' and on how you use the captions (who, when, why)' : ''}, but it cannot judge how well you used the content of the sources.</p></section>`;
}
function msBlock(q) {
  const m = q.ms; if (!m) return '';
  const L = (t, a) => a && a.length ? html`<p class="small"><strong>${t}</strong></p><ul>${a.map((x) => html`<li>${x}</li>`)}</ul>` : '';
  const src = /u4a/.test(q.qtype || '');
  return html`<details class="fold"><summary>Mark scheme: what examiners looked for</summary><div>
    <p class="small muted">Plan your own answer first, then use this to check it. These are examples of relevant points, not a checklist; marks come from the levels.</p>
    ${m.extract1 ? html`<p><b>Extract 1 argues:</b> ${m.extract1}</p>` : ''}${m.extract2 ? html`<p><b>Extract 2 argues:</b> ${m.extract2}</p>` : ''}
    ${L('Relevant points', m.points)}${L('Context to use with the source', m.context)}${L(src ? 'Own knowledge that supports the view' : 'Points that support the view', m.support)}${L(src ? 'Own knowledge that challenges the view' : 'Points that challenge the view', m.challenge)}
    <p class="small muted">Paraphrased from Pearson's mark scheme${q.pp ? ` for ${q.pp.paper}, ${q.pp.series}` : ''}.</p></div></details>`;
}
function exqBlock(q) {
  const r = q.exq; if (!r) return '';
  return html`<details class="fold"><summary>Examiner's report on this question</summary><div><p class="eyebrow">${r.series}</p>
    ${r.strong && r.strong.length ? html`<p class="small"><strong>What strong answers did</strong></p><ul>${r.strong.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
    ${r.weak && r.weak.length ? html`<p class="small"><strong>Common weaknesses</strong></p><ul>${r.weak.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
    ${r.url ? html`<p class="small muted"><a href="${r.url}" target="_blank" rel="noopener">Read the full report</a></p>` : ''}</div></details>`;
}
function ppItem(t, q, showTopic) {
  return html`<li><button class="ppq" data-act="go" data-to="${t.id}.exam.${q.id}"><span class="row" style="gap:6px"><span class="chip">${q.pp.series}</span><span class="chip">${q.pp.part}</span>${q.ms ? html`<span class="chip ok">Mark scheme</span>` : ''}${q.exq ? html`<span class="chip ok">Examiner report</span>` : ''}</span><span>${oneLine(q.q)}</span>${showTopic ? html`<span class="small muted">${t.kt ? t.kt + ': ' : ''}${t.title}</span>` : ''}</button></li>`;
}
function viewPastPapers(c) {
  const ts = courseTopics(c);
  const missing = ts.filter((t) => !S.topics[t.id]);
  if (missing.length) { Promise.all(missing.map((t) => ensureTopic(t.id))).then(render, (e) => toast(e.message)); return shell(html`<p class="muted">Loading past papers…</p>`); }
  const f = S.ui.pp && S.ui.pp.c === c.id ? S.ui.pp : (S.ui.pp = { c: c.id, paper: '', topic: '', qt: '' });
  const all = [];
  for (const t0 of ts) { const t = S.topics[t0.id]; for (const raw0 of t.exam.questions) if (raw0.pp) all.push({ t, q: resolveQ(c, raw0) }); }
  const papers = [...new Set(all.map((x) => x.q.pp.paper))].sort();
  const qtypes = [...new Set(all.map((x) => x.q.qtype).filter(Boolean))];
  const shown = all.filter((x) => (!f.paper || x.q.pp.paper.startsWith(f.paper)) && (!f.topic || x.t.id === f.topic) && (!f.qt || x.q.qtype === f.qt));
  const groups = new Map();
  for (const x of shown.sort((a, b) => a.q.pp.paper.localeCompare(b.q.pp.paper) || ppOrder(a.q, b.q))) { const k = x.q.pp.paper.replace(/R$/, '') + ' · ' + x.q.pp.series + (/R$/.test(x.q.pp.paper) ? ' (R)' : ''); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); }
  const sel = (id, label, cur, opts) => html`<label for="${id}" class="small">${label}<select id="${id}" data-ppf="${id.slice(3)}"><option value="">All</option>${opts.map(([v, l]) => html`<option value="${v}" ${v === cur ? raw('selected') : ''}>${l}</option>`)}</select></label>`;
  return shell(html`${crumbs([{ label: c.year, to: c.id }, { label: 'Past papers' }])}
    <section class="course-head" style="--course:${c.accent}"><p class="eyebrow">${c.year} · ${(c.exam && c.exam.qualification) || c.title}</p><h1>Past-paper questions</h1>
      <p class="muted">${all.length} real Pearson questions, newest first. Each opens in exam practice with the guide, a writing frame and, where available, the mark scheme's points and the examiner's comments.</p></section>
    <div style="--course:${c.accent}; display:grid; gap:16px; min-width:0">
      <section class="panel row" style="gap:12px;align-items:end">
        ${sel('pp-paper', 'Paper', f.paper, papers.map((p) => [p, p]))}
        ${sel('pp-topic', 'Topic', f.topic, ts.map((t) => [t.id, (t.kt ? t.kt + ': ' : '') + t.title]))}
        ${sel('pp-qt', 'Question type', f.qt, qtypes.map((k) => [k, (c.qtypes[k] || {}).label || k]))}
        <span class="small muted">${shown.length} shown</span></section>
      <div class="notice small">Sources and extracts belong to Pearson and are not on the site. Questions that need them get feedback on structure only. Ask Mr Garry for the source booklet.</div>
      ${[...groups.entries()].map(([k, xs]) => html`<section class="panel" style="display:grid;gap:8px"><h2>${k}</h2><ul class="pplist">${xs.map((x) => ppItem(x.t, x.q, true))}</ul></section>`)}
      ${!shown.length ? html`<p class="muted">No questions match these filters.</p>` : ''}
    </div>`);
}
function examinerBlock(qt) {
  if (!qt.examiner || !qt.examiner.length) return '';
  return html`<details class="fold"><summary>What examiners said</summary><div>${qt.examiner.map((r) => html`<p class="eyebrow">${r.series}</p>
    ${r.strong && r.strong.length ? html`<p class="small"><strong>Strong answers</strong></p><ul>${r.strong.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
    ${r.weak && r.weak.length ? html`<p class="small"><strong>Common weaknesses</strong></p><ul>${r.weak.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
    ${r.url ? html`<p class="small muted"><a href="${r.url}" target="_blank" rel="noopener">Read the full report</a></p>` : ''}`)}
    <p class="small muted">Paraphrased from Pearson's published examiner reports.</p></div></details>`;
}
function qtypeGuide(c, key, qt) {
  const past = [];
  for (const t of courseTopics(c)) { const full = S.topics[t.id]; if (!full) continue; for (const q of full.exam.questions) if (q.qtype === key) past.push({ t: full, q }); }
  return html`<article class="panel" id="sec-${key}">
    <div class="row" style="gap:6px"><span class="chip">${qt.paper}</span>${qt.marks ? html`<span class="chip mono">${qt.marks} marks</span>` : ''}<span class="chip mono">~${qt.minutes} min</span><span class="chip">${qt.ao}</span></div>
    <h3>${qt.label}</h3>
    ${qt.template ? html`<p class="frame"><span class="eyebrow">How the question is worded</span>${qt.template}</p>` : ''}
    <details class="fold" open><summary>What it asks you to do</summary><div><p>${qt.asks}</p></div></details>
    <details class="fold"><summary>Step-by-step approach</summary><div><ol>${qt.steps.map((x) => html`<li>${x}</li>`)}</ol></div></details>
    <details class="fold"><summary>Planning and timing</summary><div><p>${qt.plan}</p></div></details>
    <details class="fold"><summary>Assessment criteria and mark scheme levels</summary><div><ul>${qt.success.map((x) => html`<li>${x}</li>`)}</ul>${levelsTable(qt.markscheme)}${qt.criteria_list ? html`<p class="eyebrow">Judgement criteria</p><ul>${qt.criteria_list.map((x) => html`<li>${x}</li>`)}</ul>` : ''}${qt.evidence_tip ? html`<p class="small">${qt.evidence_tip}</p>` : ''}</div></details>
    <details class="fold"><summary>Common mistakes</summary><div><ul>${qt.mistakes.map((x) => html`<li>${x}</li>`)}</ul></div></details>
    ${examinerBlock(qt)}
    <details class="fold"><summary>Writing frame${(qt.frames || []).length > 1 ? 's' : ''}</summary><div>${(qt.frames || (qt.frame ? [{ name: 'Writing frame', ...qt.frame }] : [])).map((f) => html`<div class="frame"><span class="eyebrow">${f.name}</span><ol>${f.full.map((l) => html`<li>${l}</li>`)}</ol></div>`)}</div></details>
    ${qt.model ? html`<details class="fold"><summary>Annotated model</summary><div>${modelBlock(qt)}</div></details>` : ''}
    ${qt.requires_sources ? html`<p class="small muted">This question type needs the sources or extracts from the paper. Practise with past papers from Pearson's website or the questions Mr Garry adds.</p>` : ''}
    ${past.length ? html`<div><p class="eyebrow">Practise this question type (${past.length})</p><ul>${past.sort((a, b) => (b.q.pp ? seriesKey(b.q.pp.series) : 9e9) - (a.q.pp ? seriesKey(a.q.pp.series) : 9e9)).slice(0, isKS3(c) ? 30 : 6).map(({ t, q }) => html`<li><button class="btn sm" data-act="go" data-to="${t.id}.exam.${q.id}" style="text-align:left">${oneLine(q.q, 160)}</button> <span class="small muted">${q.label}</span></li>`)}</ul>${past.length > 6 && !isKS3(c) ? html`<button class="btn sm" data-act="go" data-to="${c.id}.past">See all ${past.length} in Past papers</button>` : ''}</div>` : ''}
  </article>`;
}
function viewGuide(c) {
  const ex = c.exam || {};
  return shell(html`${crumbs([{ label: c.year, to: c.id }, { label: 'Exam guide' }])}
    <section class="course-head" style="--course:${c.accent}"><p class="eyebrow">${c.year} · ${ex.qualification || c.title}</p><h1>Exam guide</h1><p class="muted">${ex.codes || ''}</p></section>
    <div style="--course:${c.accent}; display:grid; gap:18px; min-width:0">
    ${(ex.papers || (c.assessment && c.assessment.papers) || []).map((pp) => html`<section style="display:grid;gap:12px"><div><h2>${pp.title}</h2><p class="muted">${pp.duration ? pp.duration + ' · ' : ''}${pp.marks ? pp.marks + ' marks. ' : ''}${pp.structure}</p></div>
      ${(pp.qtypes || []).map((k) => c.qtypes[k] ? qtypeGuide(c, k, c.qtypes[k]) : '')}</section>`)}
    </div>`);
}

// ---------- topic ----------
const TABS = [['', 'Overview'], ['learn', 'Learn'], ['games', 'Games'], ['quiz', 'Quizzes'], ['flash', 'Flashcards'], ['check', 'Checklist'], ['exam', 'Exam practice'], ['frames', 'Writing frames'], ['stretch', 'Stretch']];
const isKS3 = (c) => c && c.stage === 'KS3';
function topicFrame(t, tab, inner) {
  const c = courseOf(t.course);
  return shell(html`
    ${crumbs([{ label: c.year, to: c.id }, { label: t.title, to: tab ? t.id : null }, ...(tab ? [{ label: TABS.find((x) => x[0] === tab)[1] }] : [])])}
    <div style="--course:${c.accent}; display:grid; gap:18px; min-width:0">
      <section class="course-head"><p class="eyebrow">${c.year} · ${t.kt ? t.kt + ' · ' : ''}${(c.areas || []).find((a) => a.id === t.area)?.title || c.title}</p><h1>${t.title}</h1></section>
      <nav class="tabs" aria-label="Topic sections">${TABS.filter(([k]) => k !== 'games' || isKS3(c)).map(([k, l]) => html`<button data-act="go" data-to="${t.id}${k ? '.' + k : ''}" ${k === tab ? raw('aria-current="page"') : ''}>${l}</button>`)}</nav>
      ${t.review && t.review.state === 'awaiting-teacher-check' ? html`<div class="notice small">Written for this site and awaiting Mr Garry's check against class lessons.</div>` : ''}
      ${inner}
    </div>`);
}

function videoPanel(t, compact) {
  const c = courseOf(t.course); const v = c.videos; const list = t.videos || [];
  if (!v && !list.length) return '';
  const prov = (list[0] && list[0].src) || (v && v.provider) || 'Video';
  const ks3 = !v && list.length; // e.g. GCSE-level background videos on an A level topic
  const shown = compact ? list.slice(0, 4) : list;
  return html`<section class="panel video" id="sec-watch"><span class="eyebrow">Watch</span><h2 style="margin:0">${prov} videos for this topic${list.length ? ` (${list.length})` : ''}</h2>
    ${ks3 ? html`<p class="small muted">GCSE-level overviews: a quick refresher before the A level reading.</p>` : ''}
    ${list.length ? html`<ul class="vids">${shown.map((x) => html`<li><a href="${x.url}" target="_blank" rel="noopener">▶ ${x.title}</a></li>`)}</ul>
      ${compact && list.length > shown.length ? html`<button class="btn sm" data-act="go" data-to="${t.id}.learn">All ${list.length} videos on the Learn page</button>` : ''}
      <p class="small muted">Videos open in Google Drive. If one will not play, sign in with the Google account Mr Garry shared them with, or ask him for access.</p>`
      : html`<p class="small">Sign in to ${prov} with your school account and search for <b>${(t.search || t.title)}</b>.</p>
      ${v && v.login ? html`<p class="row" style="gap:8px"><a class="btn sm" href="${v.login}" target="_blank" rel="noopener">Sign in to ${prov}</a></p>` : ''}`}
    ${compact ? '' : html`<p class="small muted">Watch, then do the quiz or flashcards for this topic to check what stuck.</p>`}</section>`;
}

// ---------- games (KS3) ----------
// Built from each topic's own content: no extra data needed. Scores and XP are saved on this device.
const RANKS = [[0, 'Apprentice Historian'], [200, 'Source Detective'], [600, 'Evidence Hunter'], [1200, 'Chronology Champion'], [2500, 'Master Historian'], [5000, 'Legendary Historian']];
const xpNow = () => lsGet('hub-xp', 0);
const rankOf = (xp) => { let r = RANKS[0]; for (const x of RANKS) if (xp >= x[0]) r = x; const nx = RANKS.find((x) => x[0] > xp); return { name: r[1], next: nx ? nx[0] : null }; };
const yearOf = (d) => { const m = String(d).match(/(\d{1,4})/); if (!m) return null; let y = +m[1]; if (/BCE|BC\b/.test(d)) y = -y; return y; };
const GAMES = [
  ['blitz', 'Quiz Blitz', '60 seconds. Answer as many as you can. Streaks multiply your score.', '⚡'],
  ['memory', 'Memory Match', 'Flip the cards and match each key word to its meaning in as few moves as possible.', '🃏'],
  ['first', 'Which Came First?', 'Two events. Tap the one that happened first. How long a streak can you build?', '⏳'],
  ['word', 'Key Word Showdown', 'Read the meaning, pick the key word. Ten rounds.', '🔤'],
  ['who', 'Who Am I?', 'Read the clue, name the person. Ten rounds.', '🕵️']
];
function poolFor(topics, kind) {
  const P = [];
  if (kind === 'blitz') {
    for (const t of topics) for (const m of t.quizzes.mcq) P.push({ prompt: m.q, options: m.options, answer: m.answer, why: m.why });
    const cards = topics.flatMap((t) => t.flashcards);
    for (const f of cards) { const wrong = shuffle(cards.filter((x) => x.a !== f.a)).slice(0, 3).map((x) => x.a); if (wrong.length < 3) continue; const opts = shuffle([f.a, ...wrong]); P.push({ prompt: f.q, options: opts, answer: opts.indexOf(f.a) }); }
  }
  if (kind === 'word') {
    const v = topics.flatMap((t) => t.learn.vocab);
    for (const x of v) { const wrong = shuffle(v.filter((y) => y.term !== x.term)).slice(0, 3).map((y) => y.term); if (wrong.length < 3) continue; const opts = shuffle([x.term, ...wrong]); P.push({ prompt: x.def, options: opts, answer: opts.indexOf(x.term) }); }
  }
  if (kind === 'who') {
    const ppl = topics.flatMap((t) => t.learn.people).filter((x) => x.role && !/^you\b/i.test(x.name));
    for (const x of ppl) { const wrong = shuffle(ppl.filter((y) => y.name !== x.name)).slice(0, 3).map((y) => y.name); if (wrong.length < 3) continue; const clue = x.role.replace(new RegExp(x.name.split(/\s+/).slice(-1)[0].replace(/[^\w]/g, ''), 'gi'), '…'); const opts = shuffle([x.name, ...wrong]); P.push({ prompt: clue, options: opts, answer: opts.indexOf(x.name) }); }
  }
  if (kind === 'first') {
    const ev = topics.flatMap((t) => t.learn.timeline).map((e) => ({ ...e, y: yearOf(e.date) })).filter((e) => e.y !== null);
    for (let n = 0; n < 40 && ev.length > 1; n++) { const [a, b] = shuffle(ev).slice(0, 2); if (Math.abs(a.y - b.y) < 1) continue; const opts = [a.event, b.event]; P.push({ prompt: 'Which happened first?', options: opts, answer: a.y < b.y ? 0 : 1, why: `${a.event} (${a.date}) · ${b.event} (${b.date})` }); }
  }
  return P;
}
function gameAvailable(topics, kind) { if (kind === 'memory') return topics.flatMap((t) => t.learn.vocab).length >= 4; return poolFor(topics, kind).length >= (kind === 'blitz' ? 6 : 4); }
function startGame(scope, topics, kind) {
  const key = scope + ':' + kind; let g;
  if (kind === 'memory') {
    const v = shuffle(topics.flatMap((t) => t.learn.vocab)).slice(0, 6);
    const cards = shuffle(v.flatMap((x, i) => [{ pair: i, text: x.term, kind: 'term' }, { pair: i, text: x.def, kind: 'def' }]));
    g = { key, kind, scope, cards, open: [], matched: [], moves: 0, start: Date.now() };
  } else {
    const pool = shuffle(poolFor(topics, kind));
    g = { key, kind, scope, qs: kind === 'blitz' ? pool : pool.slice(0, 10), i: 0, score: 0, streak: 0, bestStreak: 0, right: 0, missed: [], endAt: kind === 'blitz' ? Date.now() + 60000 : null };
  }
  S.ui.game = g; render(); if (kind === 'blitz') tickGame();
}
function tickGame() {
  clearInterval(S.ui.gameTimer);
  S.ui.gameTimer = setInterval(() => {
    const g = S.ui.game; if (!g || g.kind !== 'blitz' || g.done) { clearInterval(S.ui.gameTimer); return; }
    const left = Math.max(0, Math.ceil((g.endAt - Date.now()) / 1000)); const el = document.getElementById('gtimer'); if (el) el.textContent = left + 's';
    if (left <= 0) { finishGame(); }
  }, 250);
}
function finishGame() {
  const g = S.ui.game; if (!g || g.done) return; g.done = true; clearInterval(S.ui.gameTimer);
  const score = g.kind === 'memory' ? Math.max(10, 200 - (g.moves - 6) * 10) : g.score; g.final = score;
  const bests = lsGet('hub-best', {}); g.newBest = score > (bests[g.key] || 0); if (g.newBest) { bests[g.key] = score; lsSet('hub-best', bests); }
  g.xp = Math.round(score / 2); lsSet('hub-xp', xpNow() + g.xp); render();
}
function gameAnswer(v) {
  const g = S.ui.game; if (!g || g.done || g.lock) return; const q = g.qs[g.i]; const ok = v === q.answer;
  if (ok) { g.streak++; g.right++; g.bestStreak = Math.max(g.bestStreak, g.streak); g.score += 10 * (1 + Math.floor(g.streak / 3)); } else { g.streak = 0; g.missed.push(q); }
  g.last = { ok, v, ans: q.answer, i: g.i }; g.lock = true; render();
  setTimeout(() => { g.lock = false; g.last = null; g.i++; if (g.i >= g.qs.length) { if (g.kind === 'blitz') { g.qs = g.qs.concat(shuffle(g.qs)); } else { finishGame(); return; } } if (g.kind === 'blitz' && Date.now() >= g.endAt) { finishGame(); return; } render(); }, ok ? 450 : 1100);
}
function memoryFlip(idx) {
  const g = S.ui.game; if (!g || g.done || g.lock || g.open.includes(idx) || g.matched.includes(g.cards[idx].pair)) return;
  g.open.push(idx); if (g.open.length === 2) { g.moves++; const [a, b] = g.open.map((i) => g.cards[i]); if (a.pair === b.pair && a.kind !== b.kind) { g.matched.push(a.pair); g.open = []; if (g.matched.length === g.cards.length / 2) { finishGame(); return; } } else { g.lock = true; render(); setTimeout(() => { g.open = []; g.lock = false; render(); }, 900); return; } }
  render();
}
function gameView(scope, topics, back) {
  const g = S.ui.game && S.ui.game.scope === scope ? S.ui.game : null; const xp = xpNow(); const rk = rankOf(xp); const bests = lsGet('hub-best', {});
  const top = html`<section class="panel game-hud"><div class="row" style="justify-content:space-between"><div><span class="eyebrow">Your rank</span><b style="display:block;font-size:1.15rem">${rk.name}</b><span class="small muted">${xp} XP${rk.next ? ` · ${rk.next - xp} XP to the next rank` : ''}</span></div><div class="meter" style="width:min(200px,40vw)" aria-hidden="true"><i style="width:${rk.next ? Math.round(100 * xp / rk.next) : 100}%"></i></div></div></section>`;
  if (!g) return html`${top}<section class="games">${GAMES.filter(([k]) => gameAvailable(topics, k)).map(([k, name, desc, icon]) => html`<button class="game-card" data-act="g-start" data-v="${k}"><span class="gicon" aria-hidden="true">${icon}</span><b>${name}</b><span class="small muted">${desc}</span>${bests[scope + ':' + k] ? html`<span class="chip ok">Best: ${bests[scope + ':' + k]}</span>` : ''}</button>`)}</section>
    <p class="small muted">Scores and XP are saved on this device. Challenge a friend to beat your best!</p>`;
  if (g.done) return html`${top}<section class="panel game-end"><span class="gicon" aria-hidden="true">${g.newBest ? '🏆' : '🎯'}</span><h2>${g.newBest ? 'New personal best!' : 'Game over'}</h2>
    <p class="big">${g.final} points</p><p class="muted">${g.kind === 'memory' ? `${g.moves} moves` : `${g.right} correct · best streak ${g.bestStreak}`} · +${g.xp} XP</p>
    ${g.missed && g.missed.length ? html`<details class="fold" open><summary>Ones to revise (${g.missed.length})</summary><div><ul>${[...new Map(g.missed.map((q) => [q.prompt, q])).values()].slice(0, 8).map((q) => html`<li><b>${q.prompt}</b> → ${q.options[q.answer]}</li>`)}</ul></div></details>` : ''}
    <div class="row" style="justify-content:center"><button class="btn primary" data-act="g-start" data-v="${g.kind}">Play again</button><button class="btn" data-act="g-quit">All games</button></div></section>`;
  if (g.kind === 'memory') return html`${top}<section class="panel"><div class="row" style="justify-content:space-between"><b>Memory Match</b><span class="mono">${g.moves} move${g.moves === 1 ? "" : "s"} · ${g.matched.length}/${g.cards.length / 2} pairs</span><button class="btn sm" data-act="g-quit">Quit</button></div>
    <div class="mem">${g.cards.map((cd, i) => { const up = g.open.includes(i) || g.matched.includes(cd.pair); return html`<button class="memcard ${up ? 'up' : ''} ${g.matched.includes(cd.pair) ? 'done' : ''} ${cd.kind}" data-act="g-flip" data-v="${i}" aria-label="${up ? cd.text : 'Hidden card'}">${up ? cd.text : '?'}</button>`; })}</div></section>`;
  const q = g.qs[g.i]; const L = g.last;
  return html`${top}<section class="panel game"><div class="row" style="justify-content:space-between"><span class="chip">${g.kind === 'blitz' ? 'Quiz Blitz' : `Round ${g.i + 1} of ${g.qs.length}`}</span><span class="mono">Score ${g.score}${g.streak >= 3 ? html` · 🔥 x${1 + Math.floor(g.streak / 3)}` : ''}</span>${g.kind === 'blitz' ? html`<span class="mono gtimer" id="gtimer">${Math.max(0, Math.ceil((g.endAt - Date.now()) / 1000))}s</span>` : ''}<button class="btn sm" data-act="g-quit">Quit</button></div>
    <p class="gq">${q.prompt}</p>
    <div class="gopts ${q.options.length === 2 ? 'two' : ''}">${q.options.map((o, i) => html`<button class="gopt ${L ? (i === L.ans ? 'right' : i === L.v ? 'wrong' : '') : ''}" data-act="g-ans" data-v="${i}" ${L ? raw('disabled') : ''}>${o}</button>`)}</div>
    ${L && !L.ok && q.why ? html`<p class="small muted">${q.why}</p>` : ''}</section>`;
}
function viewGames(t) { return topicFrame(t, 'games', gameView(t.id, [t])); }
function viewArcade(c) {
  const ts = courseTopics(c); const missing = ts.filter((t) => !S.topics[t.id]);
  if (missing.length) { Promise.all(missing.map((t) => ensureTopic(t.id))).then(render, (e) => toast(e.message)); return shell(html`<p class="muted">Loading games…</p>`); }
  return shell(html`${crumbs([{ label: c.year, to: c.id }, { label: 'Games arcade' }])}<section class="course-head" style="--course:${c.accent}"><p class="eyebrow">${c.year}</p><h1>Games arcade</h1><p class="muted">Games mixing every ${c.year} topic. Earn XP and climb the historian ranks.</p></section><div style="--course:${c.accent};display:grid;gap:18px">${gameView(c.id, ts.map((t) => S.topics[t.id]))}</div>`);
}
function viewOverview(t) {
  const st = topicStats(t);
  const rec = recommendations(t);
  const d = daily();
  const cards = [
    ['learn', 'Learn', `${t.learn.sections.length} sections, timeline, key people and sources`],
    ...(isKS3(courseOf(t.course)) ? [['games', '🎮 Games', 'Quiz Blitz, Memory Match, Which Came First? and more']] : []),
    ['quiz', 'Quizzes', st.quiz == null ? 'Not started' : `${st.quiz}% correct over ${st.answered} answers`],
    ['flash', 'Flashcards', `${st.due} due now · ${st.mastered}/${st.cards} mastered`],
    ['check', 'Checklist', st.rated ? `${st.rag.green} green · ${st.rag.amber} amber · ${st.rag.red} red` : 'Rate your confidence'],
    ['exam', 'Exam practice', `${t.exam.questions.length} practice questions with feedback`],
    ['frames', 'Writing frames', 'Sentence starters and planning grids'],
    ['stretch', 'Stretch and challenge', `${t.stretch.length} harder tasks`]
  ];
  return topicFrame(t, '', html`
    <p class="prose">${t.learn.intro}</p>
    <section class="grid2">
      <div class="panel"><span class="eyebrow">Today</span><div class="row" style="gap:28px"><div class="stat"><b>${d.cards}</b><span class="small muted">cards reviewed</span></div><div class="stat"><b>${d.answers}</b><span class="small muted">questions answered</span></div></div><p class="small muted">Today's counts reset tomorrow. Your long-term progress stays.</p></div>
      <div class="panel"><span class="eyebrow">Revise next</span>${rec.length ? html`<ul style="margin:0;padding-left:1.1em;display:grid;gap:6px">${rec.map((r) => html`<li><button class="btn sm" data-act="go" data-to="${t.id}.learn" data-scroll="${r.k.sections[0]}" style="text-align:left">${r.k.text.replace(/^I can /, '')}</button> <span class="small muted">— ${r.why}</span></li>`)}</ul>` : html`<p class="muted">Rate yourself on the checklist and do a quiz — suggestions will appear here.</p>`}</div>
    </section>
    <section class="acts">${cards.map(([k, l, s]) => html`<button class="act" data-act="go" data-to="${t.id}.${k}"><b>${l}</b><span class="small muted">${s}</span></button>`)}</section>
    ${videoPanel(t, true)}
  `);
}

function blocks(bs, t) {
  return bs.map((b) => b.p ? html`<p>${b.p}</p>` : b.ul ? html`<ul>${b.ul.map((x) => html`<li>${x}</li>`)}</ul>` : b.sources ? html`<div class="grid2">${t.learn.sources.map(sourceCard)}</div>` : '');
}
function sourceCard(s) {
  return html`<article class="source"><h3>${s.title}</h3>${s.quote ? html`<blockquote>“${s.quote}”</blockquote>` : ''}<dl><dt>Type</dt><dd>${s.type}</dd><dt>Date</dt><dd>${s.date}</dd><dt>Made by</dt><dd>${s.origin}</dd><dt>Purpose</dt><dd>${s.purpose}</dd><dt>Use with care</dt><dd>${s.usefulness}</dd></dl></article>`;
}
function routeFigure() {
  return raw(`<figure class="figure" style="margin:0"><svg viewBox="0 0 640 420" role="img" aria-labelledby="mapt mapd">
  <title id="mapt">Movements of 1066 (schematic)</title><desc id="mapd">Harold marches north from London to Stamford Bridge near York, then back south to Hastings. William crosses the Channel from Normandy to Pevensey.</desc>
  <defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="currentColor"/></marker></defs>
  <rect class="sea" x="0" y="330" width="640" height="90" rx="8"/>
  <text x="470" y="405" font-size="13" opacity=".7">English Channel</text>
  <g font-size="14">
    <circle class="place" cx="330" cy="60" r="7" stroke-width="2"/><text x="345" y="56">York</text>
    <circle class="place" cx="370" cy="78" r="7" stroke-width="2"/><text x="385" y="90">Stamford Bridge · 25 Sept</text>
    <circle class="place" cx="318" cy="86" r="6" stroke-width="2"/><text x="190" y="104">Fulford · 20 Sept</text>
    <circle class="place" cx="370" cy="240" r="7" stroke-width="2"/><text x="385" y="245">London</text>
    <circle class="place" cx="420" cy="312" r="7" stroke-width="2"/><text x="300" y="300">Hastings · 14 Oct</text>
    <circle class="place" cx="450" cy="318" r="6" stroke-width="2"/><text x="465" y="314">Pevensey · 28 Sept</text>
    <circle class="place" cx="470" cy="395" r="7" stroke-width="2"/><text x="330" y="392">Normandy</text>
  </g>
  <g fill="none" stroke-width="3" stroke-linecap="round">
    <path class="route-h" style="color:var(--red)" d="M362 232 C 390 170, 395 130, 372 90" marker-end="url(#ah)"/>
    <path class="route-h" style="color:var(--red)" d="M360 92 C 330 140, 330 200, 362 236 S 400 290, 414 304" stroke-dasharray="7 6" marker-end="url(#ah)"/>
    <path class="route-w" style="color:var(--accent)" d="M470 386 C 470 360, 462 340, 454 326" marker-end="url(#ah)"/>
  </g>
  <g font-size="13"><rect x="16" y="14" width="14" height="4" fill="var(--red)"/><text x="38" y="20">Harold north (solid), then south (dashed)</text>
  <rect x="16" y="34" width="14" height="4" fill="var(--accent)"/><text x="38" y="40">William's crossing</text>
  <text x="16" y="62" opacity=".7">Schematic — positions not to scale</text></g>
</svg></figure>`);
}

function viewLearn(t) {
  const L = t.learn;
  const hasV = !!(courseOf(t.course).videos || (t.videos || []).length);
  const toc = [...(hasV ? [['watch', 'Watch']] : []), ['tl', L.figure ? 'Timeline and map' : 'Timeline'], ...L.sections.map((s) => [s.id, s.title]), ['people', 'Key people'], ['vocab', 'Key words'], ...(L.sources && L.sources.length && !L.sections.some((s) => s.blocks.some((b) => b.sources)) ? [['srcs', 'Sources to know']] : []), ['myths', 'Common misconceptions']];
  return topicFrame(t, 'learn', html`
    <div class="learn">
      <nav class="toc" aria-label="On this page">${toc.map(([id, l]) => html`<button data-act="scroll" data-id="${id}">${l}</button>`)}</nav>
      <div style="display:grid;gap:26px;min-width:0">
        ${hasV ? videoPanel(t, false) : ''}
        <section class="section" id="sec-tl"><h2>${L.figure ? 'Timeline and map' : 'Timeline'}</h2>
          <ol class="timeline">${L.timeline.map((e) => html`<li><span class="d">${e.date}</span><span>${e.event}</span></li>`)}</ol>
          ${L.figure === 'hastings-route' ? routeFigure() : ''}
        </section>
        ${L.sections.map((s) => html`<section class="section" id="sec-${s.id}"><h2>${s.title}</h2><div class="prose">${blocks(s.blocks, t)}</div>
          ${s.evidence && s.evidence.length ? html`<div class="evidence"><span class="eyebrow">Precise evidence to use</span><ul>${s.evidence.map((e) => html`<li>${e}</li>`)}</ul></div>` : ''}
          <div class="terms">${(s.terms || []).map((x) => html`<span class="chip">${x}</span>`)}</div>
          ${s.refs && s.refs.length ? html`<p class="small muted">Read more: ${s.refs.join('; ')}</p>` : ''}</section>`)}
        <section class="section" id="sec-people"><h2>Key people</h2><div class="people">${L.people.map((p) => html`<div><b>${p.name}</b><span class="muted">${p.role}</span></div>`)}</div></section>
        <section class="section" id="sec-vocab"><h2>Key words</h2><div class="vocab">${L.vocab.map((v) => html`<div><b>${v.term}</b><span class="muted">${v.def}</span></div>`)}</div></section>
        ${L.sources && L.sources.length && !L.sections.some((s) => s.blocks.some((b) => b.sources)) ? html`<section class="section" id="sec-srcs"><h2>Sources to know</h2><div class="grid2">${L.sources.map(sourceCard)}</div></section>` : ''}
        <section class="section" id="sec-myths"><h2>Common misconceptions</h2>${L.misconceptions.map((m) => html`<div class="myth"><div class="w"><span class="eyebrow">Myth</span><p>${m.wrong}</p></div><div class="r"><span class="eyebrow">Better</span><p>${m.right}</p></div></div>`)}</section>
      </div>
    </div>`);
}

// ---------- quizzes ----------
const QMODES = [['mcq', 'Multiple choice'], ['short', 'Short answer'], ['chronology', 'Chronology'], ['matching', 'Matching'], ['evidence', 'Evidence recall'], ['dates', 'Key dates'], ['mixed', 'Mixed (this topic)']];
function buildQuiz(topics, mode, n) {
  const items = [];
  for (const t of topics) {
    const Q = t.quizzes;
    const add = (type, arr) => (arr || []).forEach((it) => items.push({ type, it, tid: t.id }));
    if (mode === 'mcq' || mode === 'mixed' || mode === 'global') add('mcq', Q.mcq);
    if (mode === 'short' || mode === 'mixed' || mode === 'global') add('short', Q.short);
    if (mode === 'chronology' || mode === 'mixed') add('chronology', Q.chronology);
    if (mode === 'matching' || mode === 'mixed') add('matching', Q.matching);
    if (mode === 'evidence' || mode === 'mixed') add('evidence', Q.evidence);
  }
  if (mode === 'dates') items.push(...dateItems(topics));
  return shuffle(items).slice(0, n || items.length).map(prepItem);
}
function dateItems(topics) {
  const pool = [];
  for (const t of topics) for (const [i, e] of (t.learn.timeline || []).entries()) pool.push({ ...e, tid: t.id, i });
  const out = [];
  for (const e of pool) {
    const others = shuffle(pool.filter((o) => o.date !== e.date));
    if (others.length < 3) continue;
    if (Math.random() < 0.5) {
      const ds = [e.date, ...[...new Set(others.map((o) => o.date))].slice(0, 3)];
      out.push({ type: 'mcq', tid: e.tid, it: { id: `dt-${e.i}-a`, q: `When did this happen? ${e.event}`, options: ds, answer: 0, why: `${e.date}: ${e.event}` } });
    } else {
      const evs = [e.event, ...others.filter((o) => o.event !== e.event).slice(0, 3).map((o) => o.event)];
      out.push({ type: 'mcq', tid: e.tid, it: { id: `dt-${e.i}-b`, q: `What happened in ${e.date}?`, options: evs, answer: 0, why: `${e.date}: ${e.event}` } });
    }
  }
  return out;
}
function prepItem(x) {
  if (x.type === 'mcq') x.order = shuffle(x.it.options.map((_, i) => i));
  if (x.type === 'chronology') { let o; do { o = shuffle(x.it.items); } while (o.length > 2 && o.every((v, i) => v === x.it.items[i])); x.cur = o; }
  if (x.type === 'matching') x.rights = shuffle(x.it.pairs.map((p) => p[1]));
  x.done = false; x.ok = null;
  return x;
}
function startQuiz(scope, topics, mode, n) { S.ui.quiz = { scope, mode, items: buildQuiz(topics, mode, n), i: 0 }; render(); }

function viewQuizHome(t) {
  const qs = S.ui.quiz && S.ui.quiz.scope === t.id ? S.ui.quiz : null;
  if (qs) return topicFrame(t, 'quiz', quizRunner(qs));
  return topicFrame(t, 'quiz', html`
    <section class="panel"><h2>Choose a quiz</h2><p class="muted">Answers and explanations appear after each question. Missed questions can be retried at the end.</p>
      <div class="acts">${QMODES.filter(([m]) => quizCount(t, m) > 0).map(([m, l]) => html`<button class="act" data-act="quiz-start" data-mode="${m}"><b>${l}</b><span class="small muted">${quizCount(t, m)} items</span></button>`)}</div>
    </section>`);
}
const quizCount = (t, m) => m === 'mixed' ? Object.values(t.quizzes).reduce((a, b) => a + b.length, 0) : m === 'dates' ? (t.learn.timeline || []).length : (t.quizzes[m] || []).length;

function quizRunner(qs) {
  if (qs.i >= qs.items.length) {
    const right = qs.items.filter((x) => x.ok).length;
    const missed = qs.items.filter((x) => !x.ok);
    return html`<section class="qcard" aria-live="polite"><h2>Quiz complete</h2><p class="stat"><b>${right} / ${qs.items.length}</b><span class="muted">correct</span></p>
      <div class="row">${missed.length ? html`<button class="btn primary" data-act="quiz-retry">Retry the ${missed.length} I missed</button>` : html`<span class="chip ok">Full marks</span>`}<button class="btn" data-act="quiz-again">New quiz</button><button class="btn" data-act="quiz-exit">Back</button></div>
      ${missed.length ? html`<details class="fold"><summary>See the questions I missed</summary><div><ul>${missed.map((x) => html`<li>${itemPrompt(x)} — <b>${itemAnswer(x)}</b></li>`)}</ul></div></details>` : ''}
    </section>`;
  }
  const x = qs.items[qs.i];
  return html`<div class="row" style="justify-content:space-between"><span class="eyebrow">Question ${qs.i + 1} of ${qs.items.length}</span><button class="btn sm" data-act="quiz-exit">End quiz</button></div>
    <div class="meter" aria-hidden="true"><i style="width:${Math.round(100 * qs.i / qs.items.length)}%"></i></div>
    ${renderItem(x)}`;
}
const itemPrompt = (x) => x.type === 'chronology' || x.type === 'matching' ? x.it.title : x.it.q;
const itemAnswer = (x) => x.type === 'mcq' ? x.it.options[x.it.answer] : x.type === 'short' ? x.it.answer : x.type === 'chronology' ? x.it.items.join(' → ') : x.type === 'matching' ? x.it.pairs.map((p) => p[0] + ': ' + p[1]).join('; ') : x.it.model;

function renderItem(x) {
  const next = x.done ? html`<button class="btn primary" data-act="quiz-next" id="nextbtn">Next</button>` : '';
  if (x.type === 'mcq') {
    return html`<section class="qcard"><p class="q" id="qq">${x.it.q}</p><div class="opts" role="group" aria-labelledby="qq">
      ${x.order.map((i) => { const cls = x.done ? (i === x.it.answer ? 'right' : i === x.pick ? 'wrong' : '') : ''; return html`<button class="opt ${cls}" data-act="mcq" data-i="${i}" ${x.done ? raw('disabled') : ''}>${x.it.options[i]}</button>`; })}
      </div>${x.done ? html`<div class="feedback ${x.ok ? 'right' : 'wrong'}" role="status"><b>${x.ok ? 'Correct.' : 'Not quite.'}</b> ${x.it.why}</div>` : ''}${next}</section>`;
  }
  if (x.type === 'short') {
    return html`<form class="qcard" data-form="short"><label for="sa" class="q">${x.it.q}</label>
      <input type="text" id="sa" autocomplete="off" ${x.done ? raw('disabled') : ''} value="${x.given || ''}">
      ${x.done ? html`<div class="feedback ${x.ok ? 'right' : 'wrong'}" role="status"><b>${x.ok ? 'Correct.' : 'Not quite.'}</b> Answer: ${x.it.answer}</div>${next}` : html`<div class="row"><button class="btn primary" type="submit">Check</button><button class="btn" type="button" data-act="short-skip">I don't know</button></div>`}</form>`;
  }
  if (x.type === 'chronology') {
    return html`<section class="qcard"><p class="q">${x.it.title}</p><p class="small muted">Earliest at the top. Use the arrows to move events.</p>
      <ol class="order">${x.cur.map((ev, i) => html`<li class="${x.done ? (ev === x.it.items[i] ? 'right' : 'wrong') : ''}"><span>${ev}</span>${x.done ? '' : html`<button class="btn sm" data-act="move" data-i="${i}" data-d="-1" aria-label="Move ${ev} up" ${i === 0 ? raw('disabled') : ''}>↑</button><button class="btn sm" data-act="move" data-i="${i}" data-d="1" aria-label="Move ${ev} down" ${i === x.cur.length - 1 ? raw('disabled') : ''}>↓</button>`}</li>`)}</ol>
      ${x.done ? html`<div class="feedback ${x.ok ? 'right' : 'wrong'}" role="status"><b>${x.ok ? 'All in order.' : 'Some are out of place.'}</b> Correct order: ${x.it.items.join(' → ')}</div>${next}` : html`<button class="btn primary" data-act="chrono-check">Check order</button>`}</section>`;
  }
  if (x.type === 'matching') {
    return html`<form class="qcard" data-form="match"><p class="q">${x.it.title}</p><div class="match">
      ${x.it.pairs.map((p, i) => html`<label for="m${i}">${p[0]}</label><select id="m${i}" ${x.done ? raw('disabled') : ''}><option value="">Choose…</option>${x.rights.map((r) => html`<option ${x.picks && x.picks[i] === r ? raw('selected') : ''}>${r}</option>`)}</select>
        ${x.done && x.picks[i] !== p[1] ? html`<span></span><span class="small" style="color:var(--red)">Correct: ${p[1]}</span>` : ''}`)}
      </div>${x.done ? html`<div class="feedback ${x.ok ? 'right' : 'wrong'}" role="status"><b>${x.ok ? 'All matched.' : `${x.score} of ${x.it.pairs.length} matched.`}</b></div>${next}` : html`<button class="btn primary" type="submit">Check</button>`}</form>`;
  }
  // evidence recall
  return html`<form class="qcard" data-form="evidence"><label for="ev" class="q">${x.it.q}</label>
    <textarea id="ev" style="min-height:110px" ${x.done || x.revealed ? raw('disabled') : ''}>${x.given || ''}</textarea>
    ${x.revealed ? html`<div class="feedback ${x.hit ? 'right' : 'wrong'}"><b>${x.hit ? 'You used a key piece of evidence.' : 'Check your answer against the model.'}</b><br>Model: ${x.it.model}</div>
      ${x.done ? next : html`<p class="small">Did your answer include precise, accurate evidence like the model?</p><div class="row"><button class="btn good" type="button" data-act="ev-mark" data-ok="1">Yes, I had it</button><button class="btn bad" type="button" data-act="ev-mark" data-ok="0">No, I missed it</button></div>`}`
      : html`<button class="btn primary" type="submit">Check</button>`}</form>`;
}
function answerItem(x, ok) { x.done = true; x.ok = ok; recordAnswer(x.tid, x.it.id, ok); }

// ---------- flashcards ----------
function viewFlash(t) {
  const fs = S.ui.flash && S.ui.flash.tid === t.id ? S.ui.flash : null;
  if (fs) return topicFrame(t, 'flash', flashRunner(t, fs));
  const st = P(['flash', t.id]);
  const due = t.flashcards.filter((c) => isDue(st[c.id]));
  const pinned = t.flashcards.filter((c) => st[c.id] && st[c.id].pinned);
  const missed = t.flashcards.filter((c) => st[c.id] && st[c.id].lastMiss);
  const next = t.flashcards.map((c) => st[c.id]).filter((s) => s && s.seen && s.due > Date.now()).map((s) => s.due).sort()[0];
  return topicFrame(t, 'flash', html`
    <section class="panel"><h2>Flashcards</h2>
      <p class="muted">Say the answer in your head, reveal, then be honest. Cards you get right come back later (1, 3, 7, 14, then 30 days). Cards you miss come back in the same session.</p>
      <div class="row" style="gap:28px"><div class="stat"><b>${due.length}</b><span class="small muted">due now</span></div><div class="stat"><b>${topicStats(t).mastered}</b><span class="small muted">mastered (box 3+)</span></div><div class="stat"><b>${pinned.length}</b><span class="small muted">pinned</span></div></div>
      ${!due.length && next ? html`<p class="small muted">Next card due ${new Date(next).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}.</p>` : ''}
      <label class="row" style="font-weight:400"><input type="checkbox" id="hintsOn" ${S.ui.hints !== false ? raw('checked') : ''} style="width:auto;min-height:0"> Show hint button</label>
      <div class="row">
        <button class="btn primary" data-act="flash-start" data-set="due" ${due.length ? '' : raw('disabled')}>Start (${Math.min(due.length, 20)} cards)</button>
        <button class="btn" data-act="flash-start" data-set="pinned" ${pinned.length ? '' : raw('disabled')}>Review pinned</button>
        <button class="btn" data-act="flash-start" data-set="missed" ${missed.length ? '' : raw('disabled')}>Review last missed (${missed.length})</button>
        <button class="btn" data-act="flash-start" data-set="all">Drill all ${t.flashcards.length}</button>
      </div>
    </section>`);
}
function flashRunner(t, fs) {
  if (fs.i >= fs.queue.length) {
    return html`<section class="qcard" aria-live="polite"><h2>Session complete</h2><div class="row" style="gap:28px"><div class="stat"><b>${fs.got}</b><span class="small muted">got it</span></div><div class="stat"><b>${fs.missed}</b><span class="small muted">missed (then repeated)</span></div></div>
      <div class="row"><button class="btn primary" data-act="flash-exit">Finish</button></div></section>`;
  }
  const c = t.flashcards.find((x) => x.id === fs.queue[fs.i]);
  const st = cardState(t.id, c.id) || {};
  return html`
    <div class="row" style="justify-content:space-between"><span class="eyebrow">Card ${fs.i + 1} of ${fs.queue.length}</span>
      <div class="row"><button class="pin" data-act="pin" data-id="${c.id}" aria-pressed="${st.pinned ? 'true' : 'false'}">${st.pinned ? 'Pinned' : 'Pin card'}</button><button class="btn sm" data-act="flash-exit">End</button></div></div>
    <div class="flash" data-act="flip" role="button" tabindex="0" aria-label="${fs.flipped ? 'Answer shown' : 'Show answer'}">
      <div class="face"><b>${c.q}</b>${fs.flipped ? html`<p class="ans">${c.a}</p>` : fs.hint ? html`<p class="muted">Hint: ${c.hint}</p>` : html`<p class="small muted">Tap or press Space to reveal</p>`}</div>
    </div>
    <div class="row" style="justify-content:center">
      ${fs.flipped ? html`<button class="btn bad" data-act="flash-mark" data-ok="0">Missed</button><button class="btn good" data-act="flash-mark" data-ok="1" id="gotbtn">Got it</button>`
      : html`${S.ui.hints !== false && c.hint ? html`<button class="btn" data-act="hint">Hint</button>` : ''}<button class="btn primary" data-act="flip" id="flipbtn">Reveal answer</button>`}
    </div>`;
}

// ---------- checklist ----------
const LEVEL = { describe: 'Describe', explain: 'Explain', judge: 'Make a judgement' };
function viewCheck(t) {
  const ck = P(['check', t.id]);
  const rec = recommendations(t);
  return topicFrame(t, 'check', html`
    <section class="panel"><h2>Personal learning checklist</h2>
      <p class="muted">Rate how confident you feel. Your quiz results are shown separately, so you can see if your confidence matches what you remember.</p>
      ${rec.length ? html`<div class="notice info"><b>Revise next:</b> ${rec.map((r, i) => html`${i ? '; ' : ''}${r.k.text.replace(/^I can /, '')} (${r.why})`)}</div>` : ''}
      <div>${t.checklist.map((k) => {
        const acc = k.sections.map((s) => sectionAccuracy(t, s)).reduce((a, b) => ({ r: a.r + b.r, w: a.w + b.w }), { r: 0, w: 0 });
        const p = pct(acc.r, acc.w);
        return html`<div class="check"><div class="txt"><span>${k.text}</span><span class="row" style="gap:8px"><span class="chip lvl-${k.level}">${LEVEL[k.level]}</span><span class="small muted">Quiz: ${p == null ? 'no answers yet' : `${p}% of ${acc.r + acc.w}`}</span><button class="btn sm" data-act="go" data-to="${t.id}.learn" data-scroll="${k.sections[0]}">Revise</button></span></div>
          <div class="rag" role="group" aria-label="Confidence for: ${k.text}">${['red', 'amber', 'green'].map((v) => html`<button data-act="rag" data-id="${k.id}" data-v="${v}" aria-pressed="${ck[k.id] === v ? 'true' : 'false'}">${v[0].toUpperCase() + v.slice(1)}</button>`)}</div></div>`;
      })}</div>
    </section>`);
}

// ---------- exam practice ----------
const QTYPE = { describe: 'Describe', explain: 'Explain', source: 'Source', judge: 'Judgement' };
function qChips(q) {
  return html`${q.type ? html`<span class="chip lvl-${q.type}">${QTYPE[q.type]}</span>` : ''}${q.qtype ? html`<span class="chip">${q.label_short || q.paper || ''}</span>` : ''}${q.marks ? html`<span class="chip mono">${q.marks} marks</span>` : ''}<span class="chip mono">${q.minutes} min</span>`;
}
function viewExamList(t) {
  const c = courseOf(t.course);
  const qs = t.exam.questions.map((q) => resolveQ(c, q));
  return topicFrame(t, 'exam', html`
    ${t.exam.criteria_note && t.exam.criteria_status !== 'verified' ? html`<div class="notice">${t.exam.criteria_note}</div>` : ''}
    ${c.qtypes ? html`<div class="row"><button class="btn sm" data-act="go" data-to="${c.id}.guide">Open the ${c.year} exam guide</button></div>` : ''}
    ${(() => {
      const other = qs.filter((q) => !q.pp); const past = qs.filter((q) => q.pp).sort(ppOrder);
      const f = S.ui.ppFilter && S.ui.ppFilter.t === t.id ? S.ui.ppFilter.qt : '';
      const types = [...new Set(past.map((q) => q.qtype).filter(Boolean))];
      const shown = f ? past.filter((q) => q.qtype === f) : past;
      return html`${other.length ? html`<section style="display:grid;gap:10px"><h2>Practice questions</h2><div class="acts">${other.map((q) => html`<button class="act" data-act="go" data-to="${t.id}.exam.${q.id}"><span class="row" style="gap:6px">${qChips(q)}</span><b>${oneLine(q.q, 260)}</b><span class="small muted">${q.label}</span></button>`)}</div></section>` : ''}
        ${past.length ? html`<section style="display:grid;gap:10px"><div class="row" style="justify-content:space-between"><h2>Past-paper questions (${past.length})</h2>
          ${types.length > 1 ? html`<div class="seg-ctl" role="group" aria-label="Filter by question type"><button data-act="pp-filter" data-v="" aria-pressed="${!f}">All</button>${types.map((k) => html`<button data-act="pp-filter" data-v="${k}" aria-pressed="${f === k}">${shortQT(c, k)}</button>`)}</div>` : ''}</div>
          <p class="small muted">Real Pearson questions on this topic, newest first. <button class="linkish" data-act="go" data-to="${c.id}.past">All past papers for ${c.year}</button></p>
          <ul class="pplist">${shown.map((q) => ppItem(t, q, false))}</ul></section>` : ''}`;
    })()}`);
}

function frameBlock(q, level, fi) {
  if (level === 'none') return html`<p class="small muted">No frame — independent practice. Plan first, then write.</p>`;
  const frames = q.frames || (q.frame ? [{ name: 'Writing frame', ...q.frame }] : []);
  if (!frames.length) return '';
  const f = frames[Math.min(fi || 0, frames.length - 1)];
  const lines = level === 'full' ? f.full : f.some;
  const prompts = q.judgementPrompts || q.criteria_list;
  return html`<div class="frame"><span class="eyebrow">${frames.length > 1 ? f.name + ' · ' : ''}${level === 'full' ? 'Sentence starters' : 'Paragraph headings'}</span><ol>${lines.map((l) => html`<li>${l}</li>`)}</ol>
    ${prompts ? html`<span class="eyebrow" style="margin-top:6px">Judgement criteria</span><ul style="margin:0;padding-left:1.1em">${prompts.map((x) => html`<li>${x}</li>`)}</ul>` : ''}
    ${q.evidence_tip ? html`<p class="small">${q.evidence_tip}</p>` : ''}</div>`;
}
function frameChooser(q, cur, act) {
  const frames = q.frames || [];
  if (frames.length < 2) return '';
  return html`<div class="seg-ctl" role="group" aria-label="Choose a frame">${frames.map((f, i) => html`<button data-act="${act}" data-v="${i}" aria-pressed="${(cur || 0) === i}">${f.name}</button>`)}</div>`;
}

function feedbackView(s, all) {
  const ai = s.ai, tr = s.teacher;
  const parent = s.parent_id ? all.find((x) => x.id === s.parent_id) : null;
  return html`<article class="fb">
    <div class="row" style="justify-content:space-between"><span class="eyebrow">${parent ? 'Redraft' : 'Attempt'} · ${new Date(s.created_at).toLocaleString()}</span><span class="chip ${s.status === 'marked' ? 'ok' : s.status === 'error' ? 'bad' : ''}">${{ draft: 'Saved draft (private)', submitted: 'Sent to Mr Garry', marked: 'Feedback ready', error: 'Feedback failed', marking: 'Preparing feedback' }[s.status] || s.status}</span></div>
    ${tr ? html`<div class="notice info"><b>Mr Garry's review${tr.overrides_ai ? ' (replaces the AI mark)' : ''}:</b> ${tr.mark != null ? html`<span class="mono">${tr.mark}${tr.max ? '/' + tr.max : ''}</span>${tr.level ? ' · ' + tr.level : ''} — ` : ''}${tr.comment}</div>` : ''}
    ${s.status === 'error' ? html`<div class="notice bad">${s.ai_error || 'Feedback failed.'} Your writing is saved.</div>` : ''}
    ${parent ? html`<div class="compare"><div><span class="eyebrow">Before</span>\n${parent.text}</div><div><span class="eyebrow">After</span>\n${s.text}</div></div>` : html`<details class="fold"><summary>My response (${wordsIn(s.text)} words)</summary><div><p style="white-space:pre-wrap">${s.text}</p></div></details>`}
    ${ai ? html`
      <div class="markbox">${ai.mode === 'indicative' && ai.mark != null ? html`<b>${ai.mark}/${ai.max}</b><span>${ai.level || ''}</span><span class="chip warn">Indicative AI mark — Mr Garry may change it</span>` : html`<span class="chip">Formative feedback — no mark</span>`}</div>
      ${ai.comparison ? html`<div><h4>What changed since your last draft</h4><p>${ai.comparison}</p></div>` : ''}
      ${ai.judgement_evidence.length ? html`<div><h4>Evidence from your answer</h4><ul>${ai.judgement_evidence.map((e) => html`<li>"${e.quote}" — ${e.comment}</li>`)}</ul></div>` : ''}
      ${ai.ao_feedback.length ? html`<div><h4>Assessment objectives</h4><ul>${ai.ao_feedback.map((a) => html`<li><b>${a.ao}:</b> ${a.comment}</li>`)}</ul></div>` : ''}
      ${ai.strengths.length ? html`<div><h4>Strengths</h4><ul>${ai.strengths.map((x) => html`<li>${x}</li>`)}</ul></div>` : ''}
      ${ai.corrections.length ? html`<div><h4>Factual corrections</h4><ul>${ai.corrections.map((c) => html`<li>You wrote: ${c.error} → ${c.correction}</li>`)}</ul></div>` : ''}
      ${ai.improvements.length ? html`<div><h4>Improve next (most important first)</h4><ol>${ai.improvements.map((x) => html`<li>${x}</li>`)}</ol></div>` : ''}
      ${ai.example_improvement ? html`<div><h4>Example improvement</h4><div class="compare"><div><span class="eyebrow">Yours</span>\n${ai.example_improvement.original}</div><div><span class="eyebrow">Improved</span>\n${ai.example_improvement.improved}</div></div></div>` : ''}
      ${ai.redraft_task ? html`<div class="notice info"><b>Redraft task:</b> ${ai.redraft_task}</div>` : ''}
      ${ai.missing && ai.missing.length ? html`<p class="small muted">${ai.missing.join(' ')}</p>` : ''}
      <p class="small muted">Feedback by ${ai.provider || 'AI'} (${ai.model || ''}). It can make mistakes — check it against your notes.</p>` : ''}
    <div class="row">
      ${s.status === 'draft' || s.status === 'error' ? html`<button class="btn" data-act="sub-load" data-id="${s.id}">Edit this draft</button>` : ''}
      ${s.status === 'marked' || s.status === 'submitted' ? html`<button class="btn primary" data-act="sub-redraft" data-id="${s.id}">Redraft using this feedback</button>` : ''}
      <button class="btn sm" data-act="sub-del" data-id="${s.id}">${S.ui.confirmDel === s.id ? 'Tap again to delete' : 'Delete'}</button>
    </div>
  </article>`;
}


// ---------- free feedback (no login, no server, no cost) ----------
// 1) an instant check against the Arcadia / IGCSE writing model, run in the browser;
// 2) a ready-made feedback prompt students paste into their school's AI tool.
const WM = {
  // the Arcadia / IGCSE writing toolkit, in Mr Garry's colours
  qualifiers: ['one key reason', 'a key reason', 'the main reason', 'the most important', 'one important', 'an important', 'a significant', 'highly', 'considerably', 'largely', 'to a large extent', 'to some extent', 'to a limited extent', 'partly', 'partially', 'somewhat', 'arguably', 'significantly', 'mainly', 'primarily', 'slightly', 'moderately', 'particularly', 'extremely', 'relatively', 'on the other hand', 'another reason', 'a further reason', 'a less important', 'a minor', 'more important', 'less important', 'more significant', 'less significant', 'most significant'],
  time: ['at the start', 'at first', 'firstly', 'initially', 'to begin with', 'then', 'next', 'later', 'afterwards', 'after this', 'subsequently', 'meanwhile', 'eventually', 'finally', 'by the', 'in the short term', 'in the long term', 'immediately', 'during', 'following', 'before', 'by 1[0-9]{3}', 'in 1[0-9]{3}', 'from 1[0-9]{3}', 'until'],
  arguing: ['however', 'this was more important because', 'more important because', 'in contrast', 'on the other hand', 'although', 'whereas', 'nevertheless', 'despite', 'conversely', 'because', 'therefore', 'as a result', 'as a consequence', 'consequently', 'this meant that', 'this means that', 'this led to', 'which led to', 'this caused', 'which meant', 'thus', 'hence', 'resulting in', 'due to', 'furthermore', 'moreover', 'similarly'],
  counter: ['however', 'on the other hand', 'although', 'whereas', 'nevertheless', 'despite', 'in contrast', 'conversely', 'that said', 'alternatively'],
  judgement: ['this shows that', 'this suggests that', 'this demonstrates', 'overall', 'in conclusion', 'to conclude', 'ultimately', 'on balance', 'the most important reason', 'most important', 'most significant', 'more important', 'more significant', 'i agree', 'i disagree', 'to a large extent', 'to a limited extent', 'therefore'],
  criteria: ['duration', 'scope', 'effectiveness', 'impact', 'scale', 'speed', 'depth', 'significance', 'long-term', 'short-term', 'lasting', 'long term', 'short term']
};
// The five moves of the model, each with its toolkit colour and starters
const MOVES = [
  { k: 'qual', name: 'Topic-sentence qualifier', col: 'blue', starters: ['One key reason …', 'To a large extent …', 'On the other hand …'] },
  { k: 'time', name: 'Time connectives', col: 'green', starters: ['At the start …', 'Later …', 'Eventually …', 'Finally …'] },
  { k: 'evid', name: 'Precise evidence', col: 'purple', starters: ['For example, in 1066 …', 'This is shown by …'] },
  { k: 'arg', name: 'Arguing connectives', col: 'red', starters: ['However …', 'This was more important because …', 'In contrast …'] },
  { k: 'judg', name: 'Judgement', col: 'judge', starters: ['This shows that …', 'Overall, the most important reason was …', 'Therefore, I agree to a large/limited extent …'] }
];
const STOP = new Set('about above after again against because before being below between could during every first from have having into itself might more most other over same should some such than that their them then there these they this those through under until very were what when where which while whom with would your years year also only made many much were been ones like just make were whose against towards became become still'.split(' '));
const wmRe = (w) => new RegExp('(^|[^a-z])(' + w.replace(/[.()]/g, (m) => '\\' + m) + ')(?=[^a-z]|$)', 'i');
const hits = (txt, list) => { const f = []; for (const w of list) { const m = wmRe(w).exec(txt); if (m) { const x = m[2].toLowerCase(); if (!f.some((y) => y.includes(x))) f.push(x); } } return f; };
const EVID_RE = /\b(1[0-9]{3}|20[0-2][0-9])\b|\b\d[\d,.]*\s*(%|per cent|million|thousand|miles|km|tons|tonnes|d\b)|\b[A-Z]{2,}\s+[A-Z][a-z]+|\b[A-Z][a-z]+-[A-Z][a-z]+|\b[A-Z][a-z]+(?:\s+(?:of\s+|the\s+|de\s+)?[A-Z][a-z]+)+|(?<=[a-z,;] )[A-Z][a-z]{2,}|\bSource [A-Z]\b|\b(?:Interpretation|Extract) [0-9A-Z]\b/;
const firstSentence = (p) => (p.match(/^[\s\S]*?[.!?](?=\s|$)/) || [p])[0];
function msPointsOf(q) {
  const m = q.ms || {}; const out = [];
  for (const k of ['points', 'support', 'challenge', 'context']) for (const x of m[k] || []) out.push(x);
  return out;
}
// Colour-code a student's answer with the toolkit (blue / green / purple / red)
function toolkitMarkup(text) {
  const marks = [];
  const add = (list, cls) => { for (const w of list) { const re = new RegExp(wmRe(w).source, 'gi'); let m; while ((m = re.exec(text))) { const st = m.index + m[1].length; marks.push([st, st + m[2].length, cls]); if (re.lastIndex === m.index) re.lastIndex++; } } };
  add(WM.qualifiers, 'tk-qual'); add(WM.time, 'tk-time'); add(WM.arguing, 'tk-arg'); add(WM.judgement.filter((w) => !WM.arguing.includes(w) && !WM.qualifiers.includes(w)), 'tk-judg');
  const er = new RegExp(EVID_RE.source, 'g'); let m; while ((m = er.exec(text))) marks.push([m.index, m.index + m[0].length, 'tk-evid']);
  marks.sort((x, y) => x[0] - y[0] || (y[1] - y[0]) - (x[1] - x[0]));
  let out = ''; let pos = 0;
  for (const [st, en, cls] of marks) { if (st < pos) continue; out += esc(text.slice(pos, st)) + `<mark class="${cls}">${esc(text.slice(st, en))}</mark>`; pos = en; }
  return out + esc(text.slice(pos));
}
function writingCheck(q, text, c) {
  const paras = text.split(/\n\s*\n|\n(?=\S)/).map((x) => x.trim()).filter((x) => wordsIn(x) >= 12);
  const words = wordsIn(text);
  const judge = /judg|how far|agree|significan|main|most|successful|accurate|convinc|important/i.test((q.type || '') + ' ' + q.q);
  const seq = /explain|cause|consequence|change|develop|why|how far|significan|important/i.test(q.q);
  const target = Math.round((q.minutes || 10) * 14);
  const per = paras.map((p, i) => {
    const ts = firstSentence(p);
    return { i: i + 1, ts, qual: hits(ts, WM.qualifiers).length > 0, qualAny: hits(p, WM.qualifiers).length > 0, time: hits(p, WM.time).length > 0, evid: EVID_RE.test(p), arg: hits(p, WM.arguing).length > 0, judg: hits(p, WM.judgement).length > 0 };
  });
  const all = { qual: hits(text, WM.qualifiers), arg: hits(text, WM.arguing), time: hits(text, WM.time), counter: hits(text, WM.counter), judg: hits(text, WM.judgement), crit: hits(text, WM.criteria) };
  const dates = (text.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/g) || []).length;
  const lower = text.toLowerCase();
  const pts = msPointsOf(q).map((pt) => {
    const keys = [...new Set((pt.toLowerCase().match(/[a-z][a-z'-]{4,}/g) || []).filter((w) => !STOP.has(w)))];
    const found = keys.filter((k) => lower.includes(k.slice(0, Math.max(5, k.length - 2))));
    return { pt, covered: keys.length && found.length >= Math.min(2, keys.length) };
  });
  const good = []; const ebi = []; const n = Math.max(1, per.length);
  const tsq = per.filter((p) => p.qual).length;
  if (per.length && tsq === per.length) good.push('Every topic sentence is qualified (blue), so the reader knows how strongly you argue each point.');
  else if (tsq) { good.push(`Some topic sentences are qualified (${all.qual.slice(0, 2).map((x) => '"' + x + '"').join(', ')}).`); ebi.push(`Start paragraph${per.filter((p) => !p.qual).length > 1 ? 's' : ''} ${per.filter((p) => !p.qual).map((p) => p.i).join(', ')} with a qualified topic sentence: "One key reason …", "To a large extent …" or "On the other hand …".`); }
  else ebi.push('Begin each paragraph with a qualified topic sentence (blue): "One key reason was …", "To a large extent …", "On the other hand …".');
  const tp = per.filter((p) => p.time).length;
  if (tp >= Math.ceil(n / 2)) good.push(`You used time connectives (green) to show how events developed (${all.time.slice(0, 3).map((x) => '"' + x + '"').join(', ')}).`);
  else if (seq) ebi.push('Add time connectives (green) to show sequence: "At the start …", "Later …", "Eventually …", "Finally …".');
  if (dates >= 2 || per.filter((p) => p.evid).length >= Math.max(1, per.length - 1)) good.push(`You used precisely selected evidence (purple): ${dates} date${dates === 1 ? '' : 's'} plus names, figures or sources.`);
  else ebi.push('Use precisely selected evidence (purple) in every paragraph: a date, a named person or place, a number or a source.');
  const ap = per.filter((p) => p.arg).length;
  if (ap >= n && all.arg.length >= 2) good.push(`You explained your evidence with arguing connectives (red): ${all.arg.slice(0, 3).map((x) => '"' + x + '"').join(', ')}.`);
  else ebi.push('Link your evidence back to the question with arguing connectives (red): "This was more important because …", "However …", "In contrast …".');
  if (judge) {
    if (all.counter.length) good.push('You weighed up the other side ("' + all.counter[0] + '").'); else ebi.push('Weigh up the other side with "However …" or "In contrast …" before you reach your judgement.');
    if (per.length && per[per.length - 1].judg) good.push('You finished with a judgement.'); else ebi.push('End with a judgement: "Overall, the most important reason was … because …" or "Therefore, I agree to a large/limited extent …".');
    if (all.crit.length) good.push(`You judged using criteria (${all.crit.slice(0, 3).join(', ')}).`); else ebi.push('Support your judgement with criteria: duration, scope, effectiveness or impact.');
  }
  if (words < target * 0.5) ebi.push(`Your answer is quite short (${words} words). In ${q.minutes} minutes aim for roughly ${target} words.`);
  const missingPts = pts.filter((p) => !p.covered).slice(0, 3);
  const weakest = per.find((p) => !(p.qual && p.evid && p.arg));
  const next = weakest ? `Rewrite paragraph ${weakest.i}: ${[!weakest.qual && 'open with a qualified topic sentence (blue)', !weakest.evid && 'add a precise piece of evidence (purple)', !weakest.arg && 'explain it with an arguing connective (red)'].filter(Boolean).join(', then ')}.` : (ebi[0] || 'Add one more piece of precise evidence to your weakest paragraph and explain why it matters.');
  return { words, paras: per, good, ebi: ebi.slice(0, 3), next, pts, missingPts, dates, judge, marked: toolkitMarkup(text) };
}
function toolkitKey() {
  return html`<div class="tk-key small">${MOVES.map((m) => html`<span class="tk-k tk-${m.k}"><b>${m.name}</b> ${m.starters.join(' / ')}</span>`)}</div>`;
}
function checkView(r) {
  const tick = (b) => b ? '✓' : '—';
  return html`<section class="panel fb" id="checkout"><span class="eyebrow">Instant writing check</span><h2 style="margin:0">How your answer matches the Arcadia writing model</h2>
    <p class="small muted">This automatic check looks for the five moves of the Arcadia / IGCSE writing model: a <span class="tk-qual">qualified topic sentence</span>, <span class="tk-time">time connectives</span>, <span class="tk-evid">precisely selected evidence</span>, <span class="tk-arg">arguing connectives</span> and a <span class="tk-judg">judgement</span>. It cannot judge whether your history is accurate, and it does not give a mark.</p>
    ${r.paras.length ? html`<div class="scroll-x"><table class="data"><thead><tr><th>Paragraph</th><th class="tk-qual">Qualified topic sentence</th><th class="tk-time">Time connective</th><th class="tk-evid">Precise evidence</th><th class="tk-arg">Arguing connective</th><th class="tk-judg">Judgement</th></tr></thead><tbody>${r.paras.map((p) => html`<tr><td>${p.i}</td><td>${tick(p.qual)}</td><td>${tick(p.time)}</td><td>${tick(p.evid)}</td><td>${tick(p.arg)}</td><td>${tick(p.judg)}</td></tr>`)}</tbody></table></div>` : ''}
    <details class="fold"><summary>See your answer colour-coded</summary><div><div class="tk-text">${raw(r.marked)}</div>${toolkitKey()}</div></details>
    ${r.good.length ? html`<div><p class="small"><strong>What went well</strong></p><ul>${r.good.map((x) => html`<li>${x}</li>`)}</ul></div>` : ''}
    ${r.ebi.length ? html`<div><p class="small"><strong>Even better if</strong></p><ul>${r.ebi.map((x) => html`<li>${x}</li>`)}</ul></div>` : ''}
    ${r.missingPts.length ? html`<div><p class="small"><strong>Points from the mark scheme you could also use</strong> <span class="muted">(examples, not a checklist)</span></p><ul>${r.missingPts.map((x) => html`<li>${x.pt}</li>`)}</ul></div>` : ''}
    <div class="notice info small"><strong>Next step:</strong> ${r.next}</div></section>`;
}
function feedbackPrompt(c, t, q, text) {
  const ctx = (t.learn.sections || []).filter((s) => (q.sections || []).includes(s.id)).map((s) => `${s.title}: ${(s.evidence || []).join('; ')}`).join('\n');
  const msPts = msPointsOf(q);
  return [
    `You are an experienced history teacher at Arcadia British School, Dubai, giving written feedback to a ${c.year} student. Write in clear, encouraging British English suitable for their age.`,
    'IMPORTANT RULES: Do NOT give a mark, level or grade. Give formative feedback only. Do not rewrite the whole answer for me. Only correct facts you are sure are wrong. Quote my exact words when you praise or criticise something.',
    'Judge my writing against the Arcadia IGCSE writing model, paragraph by paragraph (PEEJ). Each paragraph should have: 1) a TOPIC SENTENCE WITH A QUALIFIER (e.g. "One key reason …", "To a large extent …", "On the other hand …"); 2) TIME CONNECTIVES showing sequence ("At the start …", "Later …", "Eventually …", "Finally …"); 3) PRECISELY SELECTED EVIDENCE (dates, named people and places, figures, sources); 4) ARGUING CONNECTIVES that explain the evidence and link it to the question ("However …", "This was more important because …", "In contrast …"); 5) a JUDGEMENT ("This shows that …", "Overall, the most important reason was …", "Therefore, I agree to a large/limited extent …"), supported by criteria (duration, scope, effectiveness, impact). In your feedback, name which of these five moves each paragraph has and which it is missing.',
    `Course: ${c.year} — ${c.title}. Topic: ${t.title}.`,
    `QUESTION (${q.label}): ${q.q}`,
    q.asks ? `What the question asks: ${q.asks}` : '',
    (q.success || []).length ? `Success criteria:\n${q.success.map((x) => '- ' + x).join('\n')}` : '',
    msPts.length ? `Points from Pearson's mark scheme for this question (paraphrased examples, NOT a checklist; do not penalise other valid points):\n${msPts.map((x) => '- ' + x).join('\n')}` : '',
    q.exq ? `What examiners said about this question: ${[...(q.exq.strong || []), ...(q.exq.weak || [])].join(' ')}` : '',
    q.sources && q.sources.length ? `Sources given with the question:\n${q.sources.map((x) => `${x.label} (${x.provenance}): ${x.text}`).join('\n')}` : (q.requires_sources ? 'The sources for this question are not included here, so do not judge how well I used their content.' + ((q.src_captions || []).length ? ' Their captions: ' + q.src_captions.join(' | ') : '') : ''),
    ctx ? `Relevant course knowledge:\n${ctx}` : '',
    'Reply with these headings: 1) What went well (2–3 points, quoting me). 2) Corrections (any factual errors). 3) Even better if (2–3 targets, most important first). 4) One improved sentence (take one of my sentences and show it improved). 5) Redraft task (one focused task).',
    `MY ANSWER:\n"""${text}"""`
  ].filter(Boolean).join('\n\n');
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch {
    const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch {} ta.remove(); return ok;
  }
}
const AI_TOOL = { name: 'Gemini', url: 'https://gemini.google.com/' };
function viewExamQ(t, rawQ) {
  const c = courseOf(t.course);
  const q = resolveQ(c, rawQ);
  const key = `${t.id}.${q.id}`;
  const ui = S.ui.exam && S.ui.exam.key === key ? S.ui.exam : (S.ui.exam = { key, level: 'full', mode: 'supported', subId: null, parentId: null, text: lsGet('hub-draft-' + key, '') });
  const mine = (S.subs || []).filter((s) => s.topic_id === t.id && s.question_id === q.id);
  const ai = S.ai || { available: false, reasons: ['Checking…'] };
  return topicFrame(t, 'exam', html`
    <div><button class="btn sm" data-act="go" data-to="${t.id}.exam">← All practice questions</button>${q.pp ? html` <button class="btn sm" data-act="go" data-to="${c.id}.past">All ${c.year} past papers</button>` : ''}</div>
    <section class="panel"><div class="row" style="gap:6px">${qChips(q)}<span class="chip">${q.label}</span></div><h2 style="white-space:pre-line">${q.q}</h2>
      ${q.prompts ? html`<p class="small">You may use the following in your answer: <b>${q.prompts.join('; ')}</b>. You must also use information of your own.</p>` : ''}${q.stem_note ? html`<p class="small muted">${q.stem_note}</p>` : ''}</section>
    ${q.sources && q.sources.length ? html`<section class="panel"><h2>Sources</h2>${q.sources.map((x) => html`<article class="source"><h3>${x.label}</h3><p class="small muted">${x.provenance}</p><blockquote>${x.text}</blockquote></article>`)}${q.sources_note ? html`<p class="small muted">${q.sources_note}</p>` : ''}</section>`
      : q.requires_sources ? srcPanel(q, c) : ''}
    <section style="display:grid;gap:8px">
      <details class="fold" open><summary>What the question asks</summary><div><p>${q.asks}</p></div></details>
      <details class="fold"><summary>Step-by-step approach</summary><div><ol>${q.steps.map((s) => html`<li>${s}</li>`)}</ol></div></details>
      <details class="fold"><summary>Planning and timing</summary><div><p>${q.plan}</p></div></details>
      <details class="fold"><summary>${q.qtype ? 'Assessment criteria and mark scheme' : 'Success criteria' + (q.markscheme && q.markscheme.verified ? '' : ' (draft)')}</summary><div>${!q.qtype && !(q.markscheme && q.markscheme.verified) ? html`<p class="small muted">Teacher-created draft — department criteria not yet added.</p>` : ''}<ul>${q.success.map((s) => html`<li>${s}</li>`)}</ul>${q.qtype ? levelsTable(q.markscheme) : ''}</div></details>
      <details class="fold"><summary>Common mistakes</summary><div><ul>${q.mistakes.map((s) => html`<li>${s}</li>`)}</ul></div></details>
      ${examinerBlock(q)}
      ${exqBlock(q)}
      ${msBlock(q)}
      ${q.model && q.model.length ? html`<details class="fold"><summary>Annotated model${rawQ.model ? ' for this question' : ' (this question type)'}</summary><div>${modelBlock(q)}</div></details>` : ''}
    </section>
    <section class="panel" id="practice">
      <div class="row" style="justify-content:space-between"><h2>${ui.parentId ? 'Redraft' : 'Practice'}</h2>
        <div class="seg-ctl" role="group" aria-label="Practice mode">${[['supported', 'Supported'], ['independent', 'Independent']].map(([k, l]) => html`<button data-act="exam-mode" data-v="${k}" aria-pressed="${ui.mode === k}">${l}</button>`)}</div></div>
      ${ui.mode === 'supported' ? html`<div class="row"><span class="small muted">Support:</span><div class="seg-ctl" role="group" aria-label="Amount of support">${[['full', 'Sentence starters'], ['some', 'Headings only'], ['none', 'None']].map(([k, l]) => html`<button data-act="exam-level" data-v="${k}" aria-pressed="${ui.level === k}">${l}</button>`)}</div>${frameChooser(q, ui.frame, 'exam-frame')}</div>${frameBlock(q, ui.level, ui.frame)}`
        : html`<div class="row"><span class="small muted">Work without support, in the time you'd have in a test.</span><button class="btn sm" data-act="timer" data-min="${q.minutes}">${S.ui.timer && S.ui.timer.key === key ? 'Restart timer' : `Start ${q.minutes}-minute timer`}</button><span id="timer" class="mono" aria-live="off"></span></div>`}
      <label for="answer">${ui.parentId ? 'Improve your answer using the feedback' : 'Your answer'}<textarea id="answer" data-key="${key}" spellcheck="true">${ui.text}</textarea></label>
      <div class="row" style="justify-content:space-between"><span class="small muted" id="wc">${wordsIn(ui.text)} words · draft kept on this device as you type</span>
        <div class="row"><button class="btn" data-act="sub-save">Save draft</button>${PREVIEW ? '' : html`<button class="btn" data-act="sub-send">Send to Mr Garry</button>`}<button class="btn" data-act="wcheck">Check my writing</button>${ai.available ? html`<button class="btn primary" data-act="sub-feedback">Save and get AI feedback</button>` : html`<button class="btn primary" data-act="ai-prompt">Get AI feedback (free)</button>`}</div></div>
      ${ai.available ? html`<p class="small muted">Feedback is generated by ${ai.provider}. Limits apply each day.</p>` : html`<p class="small muted" id="ainote"><b>Check my writing</b> gives instant feedback on the Arcadia writing model, here on this device. <b>Get AI feedback</b> copies a ready-made feedback request with your answer, the question and the mark scheme points; paste it into ${AI_TOOL.name} using your school Google account. No marks are given.</p>`}
      <div id="aiprompt"></div>
      ${S.ui.check && S.ui.check.key === key ? checkView(S.ui.check.r) : ''}
      <div id="exammsg" aria-live="polite"></div>
    </section>
    ${mine.length ? html`<section style="display:grid;gap:12px"><h2>My attempts</h2>${mine.map((s) => feedbackView(s, mine))}</section>` : ''}
  `);
}

// ---------- frames & stretch ----------
function viewFrames(t) {
  const c = courseOf(t.course);
  const plan = P(['notes', t.id, 'plan']);
  const lvl = S.ui.frameLevel || 'full';
  const seen = new Set(); const qs = [];
  for (const raw of t.exam.questions) { const q = resolveQ(c, raw); const k = q.qtype || q.id; if (seen.has(k)) continue; seen.add(k); qs.push(q); }
  const pg = t.planning || { title: 'Essay planning grid', rows: ['', '', '', ''], cols: ['Precise evidence (SPEDA)', 'Impact — what it led to', 'Weakness against the criteria', 'Rank'], editableRows: true };
  return topicFrame(t, 'frames', html`
    <section class="panel"><div class="row" style="justify-content:space-between"><h2>Writing frames</h2>
      <div class="seg-ctl" role="group" aria-label="Amount of support">${[['full', 'Sentence starters'], ['some', 'Headings only']].map(([k, l]) => html`<button data-act="frame-level" data-v="${k}" aria-pressed="${lvl === k}">${l}</button>`)}</div></div>
      <p class="muted">Each question type needs a different shape. Start with sentence starters, then switch to headings only as you get more confident.</p>
      <div class="grid2">${qs.map((q) => html`<div style="display:grid;gap:8px;min-width:0"><span class="row" style="gap:6px">${qChips(q)}</span><b>${q.qtype ? q.label_short || (c.qtypes[q.qtype] || {}).label : q.q}</b>${(q.frames || [null]).map((_, i) => frameBlock(q, lvl, i))}</div>`)}</div>
    </section>
    <section class="panel"><h2>${pg.title}</h2><p class="muted">${pg.editableRows ? 'Write one factor per row, then rank them. ' : 'Fill one row per factor, then decide which mattered most. '}Saved automatically.</p>
      <div class="scroll-x"><table class="grid-plan"><thead><tr><th>Factor</th>${pg.cols.map((x) => html`<th>${x}</th>`)}</tr></thead><tbody>
      ${pg.rows.map((f, i) => html`<tr><th scope="row">${pg.editableRows ? html`<label class="sr" for="pl-${i}-f">Factor ${i + 1}</label><textarea id="pl-${i}-f" data-plan="${i}-f" placeholder="Factor ${i + 1}">${plan[i + '-f'] || ''}</textarea>` : f}</th>${pg.cols.map((col, j) => { const k = ['e', 'h', 'd', 'r', 'x'][j]; return html`<td><label class="sr" for="pl-${i}-${k}">${f || 'Factor ' + (i + 1)}: ${col}</label><textarea id="pl-${i}-${k}" data-plan="${i}-${k}">${plan[i + '-' + k] || ''}</textarea></td>`; })}</tr>`)}
      </tbody></table></div>
      <label for="pl-j">${pg.judgement || 'My judgement: the most important factor was … because … (use duration, scope, effectiveness or impact)'}<textarea id="pl-j" data-plan="j" style="min-height:90px">${plan.j || ''}</textarea></label>
    </section>`);
}
function viewStretch(t) {
  const notes = P(['notes', t.id, 'stretch']);
  return topicFrame(t, 'stretch', html`
    <section style="display:grid;gap:12px">${t.stretch.map((s) => html`<article class="panel"><span class="eyebrow">${s.kind}</span><p>${s.task}</p><label for="st-${s.id}" class="sr">My response</label><textarea id="st-${s.id}" data-stretch="${s.id}" style="min-height:120px" placeholder="Your thinking — saved automatically">${notes[s.id] || ''}</textarea></article>`)}</section>`);
}

// ---------- course-level retrieval ----------
function viewCourseQuiz(c, mode) {
  const scope = `course:${c.id}:${mode}`;
  const qs = S.ui.quiz && S.ui.quiz.scope === scope ? S.ui.quiz : null;
  const title = mode === 'dates' ? 'Key dates quiz' : 'Mixed quiz';
  return shell(html`${crumbs([{ label: c.year, to: c.id }, { label: title }])}
    <div style="--course:${c.accent}; display:grid; gap:18px; min-width:0">
    <section class="course-head"><p class="eyebrow">${c.year} · ${c.title}</p><h1>${title}</h1></section>
    ${qs ? quizRunner(qs) : html`<section class="panel"><p class="muted">${mode === 'dates' ? 'Dates and events from the timelines of every topic in this course.' : 'Questions from every topic in this course, in random order — the best way to keep earlier topics fresh.'}</p>
      <div class="row"><button class="btn primary" data-act="course-quiz" data-c="${c.id}" data-mode="${mode}" data-n="10">10 questions</button><button class="btn" data-act="course-quiz" data-c="${c.id}" data-mode="${mode}" data-n="20">20 questions</button></div></section>`}
    </div>`);
}

// ---------- mixed retrieval ----------
function viewMixed() {
  const qs = S.ui.quiz && S.ui.quiz.scope === 'global' ? S.ui.quiz : null;
  return shell(html`${crumbs([{ label: 'Mixed retrieval quiz' }])}<h1>Mixed retrieval quiz</h1>
    ${qs ? quizRunner(qs) : html`<section class="panel"><p class="muted">Multiple-choice and short-answer questions from every topic you can access, in random order.</p><div class="row"><button class="btn primary" data-act="mixed-start" data-n="10">10 questions</button><button class="btn" data-act="mixed-start" data-n="20">20 questions</button></div></section>`}`);
}

// ---------- account ----------
function viewAccount() {
  return shell(html`${crumbs([{ label: PREVIEW ? 'Preview settings' : 'My account' }])}<section class="panel"><h1>${PREVIEW ? 'Preview' : S.user.username}</h1>
    ${PREVIEW ? html`<p class="muted">Progress in this preview is saved in this browser only.</p>` : html`<p class="muted">Your progress and answers are private: only you and Mr Garry can see them.</p>`}
    <div class="row">${PREVIEW ? '' : html`<button class="btn" data-act="mydata">Download my data</button>`}
    ${PREVIEW ? html`<button class="btn bad" data-act="reset-preview">${S.ui.confirmReset ? 'Tap again to erase' : 'Erase preview progress'}</button>` : html`<button class="btn" data-act="logout">Sign out</button>`}</div>
    <p class="small muted">${PREVIEW ? '' : 'AI feedback on written answers is generated by Anthropic\'s Claude API. Only your answer text and the question are sent — not your name.'}</p></section>`);
}

// ---------- search ----------
function searchIndex() {
  const out = [];
  for (const t of Object.values(S.topics)) {
    out.push({ label: 'Topic', title: t.title, text: t.learn.intro, to: t.id });
    for (const s of t.learn.sections) out.push({ label: 'Learn', title: s.title, text: s.blocks.map((b) => b.p || (b.ul || []).join(' ')).join(' ') + ' ' + (s.terms || []).join(' '), to: t.id + '.learn', scroll: s.id });
    for (const v of t.learn.vocab) out.push({ label: 'Key word', title: v.term, text: v.def, to: t.id + '.learn', scroll: 'vocab' });
    for (const p of t.learn.people) out.push({ label: 'Person', title: p.name, text: p.role, to: t.id + '.learn', scroll: 'people' });
    for (const e of t.learn.timeline) out.push({ label: 'Date', title: e.date, text: e.event, to: t.id + '.learn', scroll: 'tl' });
    for (const c of t.flashcards) out.push({ label: 'Flashcard', title: c.q, text: c.a, to: t.id + '.flash' });
  }
  return out;
}
function openSearch() {
  const ov = document.createElement('div');
  ov.className = 'overlay'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Search');
  ov.innerHTML = '<div class="box"><label for="q" class="sr">Search</label><input type="text" id="q" placeholder="Search people, dates, key words…" autocomplete="off"><div class="results" id="res"><p class="small muted">Search people, dates, key words and flashcards across every topic.</p></div></div>';
  document.body.appendChild(ov);
  const idx = searchIndex();
  const input = ov.querySelector('#q'), res = ov.querySelector('#res');
  const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); const b = e.target.closest('[data-to]'); if (b) { close(); S.ui.scrollTo = b.dataset.scroll || null; go(b.dataset.to); } });
  input.addEventListener('input', () => {
    const q = norm(input.value); if (q.length < 2) { res.innerHTML = ''; return; }
    const terms = q.split(' ');
    const hits = idx.filter((x) => { const h = norm(x.title + ' ' + x.text); return terms.every((w) => h.includes(w)); }).slice(0, 12);
    res.innerHTML = hits.length ? hits.map((h) => fmt(html`<button data-to="${h.to}" data-scroll="${h.scroll || ''}"><span class="eyebrow">${h.label}</span><b>${h.title}</b><span class="small muted">${h.text.slice(0, 110)}${h.text.length > 110 ? '…' : ''}</span></button>`)).join('') : '<p class="small muted">No matches.</p>';
  });
  input.focus();
}

// ---------- teacher ----------
const TT = [['', 'Submissions'], ['students', 'Students'], ['schemes', 'Mark schemes'], ['content', 'Content'], ['settings', 'AI and limits'], ['backup', 'Backup and export']];
function teacherFrame(tab, inner) {
  return shell(html`${crumbs([{ label: 'Teacher area' }])}<h1>Teacher area</h1>
    <nav class="tabs" aria-label="Teacher sections">${TT.map(([k, l]) => html`<button data-act="go" data-to="teacher${k ? '.' + k : ''}" ${k === tab ? raw('aria-current="page"') : ''}>${l}</button>`)}</nav>
    <div id="tmsg" aria-live="polite"></div>${inner}
    <div class="row"><button class="btn sm" data-act="logout">Sign out</button></div>`);
}
async function tload(key, url) { if (!S.teacher[key]) { S.teacher[key] = 'loading'; try { S.teacher[key] = await Store.call('GET', url); } catch (e) { S.teacher[key] = { error: e.message }; } render(); } return S.teacher[key]; }
const loading = html`<p class="muted">Loading…</p>`;

function viewTeacher(tab, arg) {
  if (tab === 'sub') { tab = ''; } else arg = null;
  if (tab === '') {
    const d = S.teacher.subs; if (!d || d === 'loading') { tload('subs', '/api/teacher/submissions'); return teacherFrame(tab, loading); }
    if (arg) {
      const s = d.submissions.find((x) => x.id === arg); if (!s) return teacherFrame(tab, html`<p>Not found.</p>`);
      const tr = s.teacher || {};
      return teacherFrame(tab, html`<button class="btn sm" data-act="go" data-to="teacher">← All submissions</button>
        <section class="panel"><span class="eyebrow">${s.username} · ${s.class || ''} · ${s.topic_id} ${s.question_id}</span>${feedbackView({ ...s, teacher: null }, d.submissions)}</section>
        <form class="panel" data-form="review" data-id="${s.id}"><h2>Your review</h2><p class="small muted">The student sees your review above the AI feedback. Tick "replaces AI mark" to override.</p>
          <div class="grid2"><label for="rv-m">Mark<input type="number" id="rv-m" value="${tr.mark ?? ''}"></label><label for="rv-x">Out of<input type="number" id="rv-x" value="${tr.max ?? (s.ai && s.ai.max) ?? ''}"></label><label for="rv-l">Level<input type="text" id="rv-l" value="${tr.level || ''}"></label></div>
          <label for="rv-c">Comment<textarea id="rv-c" style="min-height:120px">${tr.comment || ''}</textarea></label>
          <label class="row" style="font-weight:400"><input type="checkbox" id="rv-o" style="width:auto;min-height:0" ${tr.overrides_ai || !s.ai ? raw('checked') : ''}> My review replaces the AI mark</label>
          <button class="btn primary" type="submit">Save review</button></form>`);
    }
    return teacherFrame(tab, html`<section class="panel"><div class="row" style="justify-content:space-between"><h2>Submissions</h2><button class="btn sm" data-act="trefresh" data-k="subs">Refresh</button></div>
      ${d.submissions.length ? html`<div class="scroll-x"><table class="data"><thead><tr><th>Student</th><th>Question</th><th>Status</th><th>AI</th><th>You</th><th></th></tr></thead><tbody>
      ${d.submissions.map((s) => html`<tr><td>${s.username}<br><span class="small muted">${s.class || ''}</span></td><td>${s.question_id}${s.parent_id ? ' (redraft)' : ''}</td><td>${s.status}</td><td class="mono">${s.ai ? (s.ai.mark != null ? s.ai.mark + '/' + s.ai.max : 'formative') : '—'}</td><td class="mono">${s.teacher ? (s.teacher.mark != null ? s.teacher.mark : '✓') : '—'}</td><td><button class="btn sm" data-act="go" data-to="teacher.sub.${s.id}">Open</button></td></tr>`)}
      </tbody></table></div>` : html`<p class="muted">No submitted work yet. Drafts that students have not sent for feedback stay private to them until they ask for feedback.</p>`}</section>`);
  }
  if (tab === 'students') {
    const d = S.teacher.students; if (!d || d === 'loading') { tload('students', '/api/teacher/students'); return teacherFrame(tab, loading); }
    const made = S.teacher.made;
    return teacherFrame(tab, html`
      <form class="panel" data-form="mkstudents"><h2>Add students</h2><p class="muted">One per line: <span class="mono">username, class</span>. Use pseudonymous usernames (for example <span class="mono">7a.amira.k</span>); no emails are stored.</p>
        <label for="mk">Students<textarea id="mk" style="min-height:120px" placeholder="7a.amira.k, 7A&#10;7a.ben.t, 7A"></textarea></label><button class="btn primary" type="submit">Create accounts</button></form>
      ${made ? html`<section class="panel"><h2>New sign-in codes</h2><div class="notice">Shown once. Copy them now and give each student their own.</div><pre class="code" id="codes">${made.map((m) => `${m.username}\t${m.code}\t${m.class || ''}`).join('\n')}</pre><button class="btn" data-act="copy" data-src="codes">Copy all</button></section>` : ''}
      <section class="panel"><h2>Students (${d.students.length})</h2>${d.students.length ? html`<div class="scroll-x"><table class="data"><thead><tr><th>Username</th><th>Class</th><th>Last active</th><th>Answers</th><th></th></tr></thead><tbody>
      ${d.students.map((s) => html`<tr><td>${s.username}</td><td>${s.class || ''}</td><td class="small">${s.last_active ? new Date(s.last_active).toLocaleDateString() : '—'}</td><td class="mono">${s.submissions}</td><td class="row" style="gap:6px"><button class="btn sm" data-act="reset-code" data-id="${s.id}">New code</button><button class="btn sm" data-act="export-student" data-id="${s.id}" data-u="${s.username}">Export</button><button class="btn sm bad" data-act="del-student" data-id="${s.id}">${S.ui.confirmDel === s.id ? 'Tap again: delete all data' : 'Delete'}</button></td></tr>`)}
      </tbody></table></div>` : html`<p class="muted">No students yet.</p>`}</section>`);
  }
  if (tab === 'schemes') {
    const form = (m, attrs, eyebrow, title, id) => html`<form class="panel" data-form="scheme" ${raw(attrs)}><span class="eyebrow">${eyebrow}</span><h3>${title}</h3>
        ${m.verified ? html`<span class="chip ok">Verified — AI gives indicative marks</span>` : html`<span class="chip warn">Not verified — AI gives formative feedback only</span>`}
        <div class="grid2"><label for="ms-s-${id}">Source of criteria<input type="text" id="ms-s-${id}" name="source" value="${m.source || ''}"></label><label for="ms-x-${id}">Maximum marks<input type="number" id="ms-x-${id}" name="max" value="${m.max_marks ?? ''}"></label></div>
        <label for="ms-l-${id}">Levels — one per line: <span class="mono">Level | marks | descriptor</span><textarea id="ms-l-${id}" name="levels" style="min-height:160px">${(m.levels || []).map((l) => `${l.level} | ${l.marks} | ${l.descriptor}`).join('\n')}</textarea></label>
        <label for="ms-n-${id}">Notes (caps, best-fit rules)<input type="text" id="ms-n-${id}" name="notes" value="${m.notes || ''}"></label>
        <label for="ms-i-${id}">Indicative content (optional, one per line)<textarea id="ms-i-${id}" name="indicative" style="min-height:70px">${(m.indicative_content || []).join('\n')}</textarea></label>
        <label class="row" style="font-weight:400"><input type="checkbox" name="ao" style="width:auto;min-height:0" ${m.ao_separate ? raw('checked') : ''}> Assessment objectives are marked separately in this scheme</label>
        <label class="row" style="font-weight:400"><input type="checkbox" name="verified" style="width:auto;min-height:0" ${m.verified ? raw('checked') : ''}> I have checked this against the official or department document (enables indicative marks)</label>
        <button class="btn primary" type="submit">Save mark scheme</button></form>`;
    const courses = S.catalog.courses.courses;
    return teacherFrame(tab, html`<section class="panel"><h2>Mark schemes</h2><p class="muted">AI feedback gives an indicative mark only where the mark scheme is ticked as verified. Exam-course question types are pre-filled from Pearson's published mark schemes and your training booklet — check the wording, then tick. Questions that use a question type share its mark scheme.</p></section>
      ${courses.filter((c) => c.qtypes).map((c) => html`<h2>${c.year} — ${c.title}</h2>${Object.entries(c.qtypes).map(([k, qt]) => form(qt.markscheme || {}, `data-c="${c.id}" data-k="${k}"`, `${c.year} · ${qt.paper} · ${qt.marks} marks`, qt.label, c.id + '-' + k))}`)}
      <h2>Individual questions</h2>
      ${Object.values(S.topics).map((t) => t.exam.questions.filter((q) => !q.qtype).map((q) => form(q.markscheme || {}, `data-t="${t.id}" data-q="${q.id}"`, t.title, q.q, t.id + '-' + q.id)))}`);
  }
  if (tab === 'content') {
    const d = S.teacher.content; if (!d || d === 'loading') { tload('content', '/api/teacher/content'); return teacherFrame(tab, loading); }
    const ed = S.teacher.editing;
    return teacherFrame(tab, html`<section class="panel"><h2>Content</h2><p class="muted">Edit any course or topic as JSON. Draft topics are hidden from students. Changes save to the server; use Backup and export for copies.</p>
      <table class="data"><thead><tr><th>Item</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody>${d.items.map((c) => html`<tr><td class="mono">${c.id}</td><td><span class="chip ${c.status === 'published' ? 'ok' : 'warn'}">${c.status}</span></td><td class="small">${new Date(c.updated_at).toLocaleString()}</td><td><button class="btn sm" data-act="edit-content" data-id="${c.id}">Edit</button></td></tr>`)}</tbody></table>
      <div class="row"><label for="imp" class="btn">Import a topic or course file<input type="file" id="imp" accept=".json,application/json" class="sr"></label><button class="btn" data-act="export-content">Download all content</button></div></section>
      ${ed ? html`<form class="panel" data-form="content" data-id="${ed.id}"><h2>Editing <span class="mono">${ed.id}</span></h2><label for="cj">JSON<textarea id="cj" style="min-height:420px;font-family:var(--mono);font-size:.85rem">${JSON.stringify(ed.data, null, 2)}</textarea></label>
        <label for="cs">Status<select id="cs"><option value="draft" ${ed.status === 'draft' ? raw('selected') : ''}>Draft (hidden from students)</option><option value="published" ${ed.status === 'published' ? raw('selected') : ''}>Published</option></select></label>
        <div class="row"><button class="btn primary" type="submit">Validate and save</button><button class="btn" type="button" data-act="edit-close">Close</button></div></form>` : ''}`);
  }
  if (tab === 'settings') {
    const d = S.teacher.settings; if (!d || d === 'loading') { tload('settings', '/api/teacher/settings'); return teacherFrame(tab, loading); }
    const u = S.teacher.usage; if (!u) tload('usage', '/api/teacher/usage');
    const s = d.settings;
    const f = (k, l, help, step = '1') => html`<label for="set-${k}">${l}<input type="number" step="${step}" id="set-${k}" name="${k}" value="${s[k] ?? ''}">${help ? html`<span class="small muted" style="font-weight:400">${help}</span>` : ''}</label>`;
    return teacherFrame(tab, html`
      <section class="panel"><h2>AI feedback status</h2>${d.ai.available ? html`<div class="notice info">Available — ${d.ai.provider}, model <span class="mono">${d.ai.model}</span>.</div>` : html`<div class="notice">Unavailable: ${d.ai.reasons.join(' ')}</div>`}
        <p>This month: <b class="mono">$${d.ai.spent_usd.toFixed(2)}</b> of <b class="mono">$${d.ai.budget_usd}</b>.</p>
        ${u && u !== 'loading' && u.by_day ? html`<details class="fold"><summary>Usage by day</summary><div><table class="data"><thead><tr><th>Day</th><th>Requests</th><th>Cost (USD)</th></tr></thead><tbody>${u.by_day.map((r) => html`<tr><td class="mono">${r.day}</td><td class="mono">${r.requests}</td><td class="mono">${r.usd.toFixed(4)}</td></tr>`)}</tbody></table></div></details>` : ''}</section>
      <form class="panel" data-form="settings"><h2>AI and limits</h2>
        <label class="row" style="font-weight:400"><input type="checkbox" name="ai_enabled" style="width:auto;min-height:0" ${s.ai_enabled ? raw('checked') : ''}> AI feedback switched on</label>
        <label for="set-ai_model">Model<input type="text" id="set-ai_model" name="ai_model" value="${s.ai_model}"></label>
        <div class="grid2">
          ${f('price_input_per_mtok', 'Input price (USD per million tokens)', 'Copy from the provider\'s pricing page. Required.', '0.01')}
          ${f('price_output_per_mtok', 'Output price (USD per million tokens)', 'Required.', '0.01')}
          ${f('monthly_budget_usd', 'Monthly ceiling (USD)', 'Requests that could exceed this are refused before they are sent.', '0.5')}
          ${f('max_output_tokens', 'Longest AI reply (tokens)')}
          ${f('max_words', 'Longest student answer (words)')}
          ${f('daily_marks_per_student', 'Feedback requests per student per day')}
          ${f('cooldown_seconds', 'Seconds between requests (per student)')}
          ${f('max_resubmissions', 'Redrafts allowed per answer')}
        </div>
        <p class="small muted">The ceiling is enforced by this website using the prices you enter. Also set a spending limit in your Anthropic Console account as a second safeguard.</p>
        <button class="btn primary" type="submit">Save settings</button></form>
      <form class="panel" data-form="password"><h2>Change your password</h2><div class="grid2"><label for="pw1">Current<input type="password" id="pw1" autocomplete="current-password"></label><label for="pw2">New (10+ characters)<input type="password" id="pw2" autocomplete="new-password"></label></div><button class="btn" type="submit">Change password</button></form>`);
  }
  if (tab === 'backup') {
    return teacherFrame(tab, html`<section class="panel"><h2>Backup</h2><p class="muted">A full backup contains all accounts, content, progress, submissions and settings. Keep it somewhere secure — it includes students' work.</p>
      <div class="row"><button class="btn primary" data-act="backup">Download full backup</button><button class="btn" data-act="export-progress">Download all progress</button><button class="btn" data-act="export-content">Download all content</button></div></section>
      <section class="panel"><h2>Restore</h2><div class="notice bad">Restoring replaces everything on this site with the backup, and signs everyone out.</div>
      <label for="restore" class="btn">Choose backup file<input type="file" id="restore" accept=".json,application/json" class="sr"></label>
      ${S.teacher.pendingRestore ? html`<p>Ready to restore backup from <b>${S.teacher.pendingRestore.created_at}</b> (${S.teacher.pendingRestore.users.length} accounts).</p><div class="row"><button class="btn bad" data-act="restore-go">Replace everything with this backup</button><button class="btn" data-act="restore-cancel">Cancel</button></div>` : ''}</section>`);
  }
  return teacherFrame(tab, html`<p>Unknown section.</p>`);
}

// ---------- render ----------
let lastTopicPromise = {};
async function ensureTopic(id) {
  if (S.topics[id]) return S.topics[id];
  if (!lastTopicPromise[id]) lastTopicPromise[id] = Store.topic(id).then((t) => { S.topics[id] = t; return t; }).catch((e) => { delete lastTopicPromise[id]; throw e; });
  return lastTopicPromise[id];
}
function render() {
  if (!S.user) { root.innerHTML = viewLogin(S.ui.loginError).s; return; }
  const r = parseRoute();
  let out;
  try {
    if (!r.a) out = viewHome();
    else if (r.a === 'mixed') out = viewMixed();
    else if (r.a === 'account') out = viewAccount();
    else if (r.a === 'teacher' && S.user.role === 'teacher') out = viewTeacher(r.b, r.c);
    else if (courseOf(r.a)) { const c = courseOf(r.a); out = r.b === 'guide' && c.qtypes ? viewGuide(c) : r.b === 'past' && c.qtypes ? viewPastPapers(c) : r.b === 'games' && isKS3(c) ? viewArcade(c) : (r.b === 'mixed' || r.b === 'dates') ? viewCourseQuiz(c, r.b) : viewCourse(c); }
    else if (S.catalog.topics[r.a]) {
      const t = S.topics[r.a];
      if (!t) { ensureTopic(r.a).then(render, (e) => toast(e.message)); out = shell(html`<p class="muted">Loading…</p>`); }
      else if (!r.b) out = viewOverview(t);
      else if (r.b === 'learn') out = viewLearn(t);
      else if (r.b === 'games' && isKS3(courseOf(t.course))) out = viewGames(t);
      else if (r.b === 'quiz') out = viewQuizHome(t);
      else if (r.b === 'flash') out = viewFlash(t);
      else if (r.b === 'check') out = viewCheck(t);
      else if (r.b === 'exam') { const q = t.exam.questions.find((x) => x.id === r.c); out = q ? viewExamQ(t, q) : viewExamList(t); if (q && !S.subs) loadSubs(); }
      else if (r.b === 'frames') out = viewFrames(t);
      else if (r.b === 'stretch') out = viewStretch(t);
    }
    if (!out) out = shell(html`<section class="panel"><h1>Page not found</h1><button class="btn" data-act="go" data-to="">Go home</button></section>`);
  } catch (e) { console.error(e); out = shell(html`<div class="notice bad">Something went wrong showing this page: ${e.message}</div>`); }
  const y = window.scrollY;
  root.innerHTML = out.s;
  paintSave();
  if (S.ui.scrollTo) { const el = document.getElementById('sec-' + S.ui.scrollTo); S.ui.scrollTo = null; if (el) { el.scrollIntoView(); S.ui.scrollTop = false; return; } }
  if (S.ui.scrollTop) { window.scrollTo(0, 0); S.ui.scrollTop = false; const m = document.getElementById('main'); if (m) m.focus({ preventScroll: true }); } else window.scrollTo(0, y);
  if (S.ui.focus) { const el = document.getElementById(S.ui.focus); S.ui.focus = null; if (el) el.focus(); }
}
async function loadSubs() {
  if (S.user && S.user.role === 'teacher') { S.subs = []; S.ai = { available: false, reasons: ['You are signed in as the teacher — students write and request feedback here; their work appears in the Teacher area.'] }; render(); return; }
  try { const r = await Store.submissions(); S.subs = r.submissions; S.ai = r.ai; } catch (e) { S.subs = []; S.ai = { available: false, reasons: [e.message] }; }
  render();
}
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3500);
}
function download(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function examMsg(m, bad) { const el = document.getElementById('exammsg'); if (el) el.innerHTML = fmt(html`<div class="notice ${bad ? 'bad' : 'info'}">${m}</div>`); }
function tmsg(m, bad) { const el = document.getElementById('tmsg'); if (el) el.innerHTML = fmt(html`<div class="notice ${bad ? 'bad' : 'info'}">${m}</div>`); else toast(m); }

// ---------- actions ----------
const curTopic = () => S.topics[parseRoute().a];
const A = {
  go: (el) => { if (el.dataset.scroll) S.ui.scrollTo = el.dataset.scroll; S.ui.quiz = null; S.ui.flash = null; go(el.dataset.to); },
  theme: () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; lsSet('hub-theme', next);
  },
  search: () => openSearch(),
  scroll: (el) => { const s = document.getElementById('sec-' + el.dataset.id); if (s) { s.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); s.setAttribute('tabindex', '-1'); s.focus({ preventScroll: true }); } },
  'quiz-start': (el) => startQuiz(curTopic().id, [curTopic()], el.dataset.mode),
  'mixed-start': (el) => startQuiz('global', Object.values(S.topics), 'global', +el.dataset.n),
  'pp-filter': (el) => { S.ui.ppFilter = { t: curTopic().id, qt: el.dataset.v }; render(); },
  'course-quiz': (el) => { const c = courseOf(el.dataset.c); const ts = courseTopics(c).map((t) => S.topics[t.id]).filter(Boolean); startQuiz(`course:${c.id}:${el.dataset.mode}`, ts, el.dataset.mode === 'dates' ? 'dates' : 'global', +el.dataset.n); },
  'exam-frame': (el) => { S.ui.exam.frame = +el.dataset.v; render(); },
  'quiz-exit': () => { S.ui.quiz = null; render(); },
  'quiz-again': () => { const q = S.ui.quiz; S.ui.quiz = null; if (q.scope === 'global') startQuiz('global', Object.values(S.topics), 'global', q.items.length); else if (q.scope.startsWith('course:')) { const [, cid, mode] = q.scope.split(':'); const ts = courseTopics(courseOf(cid)).map((t) => S.topics[t.id]).filter(Boolean); startQuiz(q.scope, ts, mode === 'dates' ? 'dates' : 'global', q.items.length); } else render(); },
  'quiz-retry': () => { const q = S.ui.quiz; q.items = q.items.filter((x) => !x.ok).map((x) => prepItem({ type: x.type, it: x.it, tid: x.tid })); q.i = 0; render(); },
  'quiz-next': () => { S.ui.quiz.i++; S.ui.focus = 'nextfocus'; render(); const f = document.querySelector('.qcard .opt, .qcard input, .qcard textarea, .qcard select, .qcard .btn'); if (f) f.focus(); },
  mcq: (el) => { const x = S.ui.quiz.items[S.ui.quiz.i]; x.pick = +el.dataset.i; answerItem(x, x.pick === x.it.answer); render(); focusNext(); },
  'short-skip': () => { const x = S.ui.quiz.items[S.ui.quiz.i]; x.given = ''; answerItem(x, false); render(); focusNext(); },
  move: (el) => { const x = S.ui.quiz.items[S.ui.quiz.i]; const i = +el.dataset.i, j = i + +el.dataset.d; [x.cur[i], x.cur[j]] = [x.cur[j], x.cur[i]]; render(); const b = document.querySelectorAll('.order li')[j]?.querySelector(`[data-d="${el.dataset.d}"]`) || document.querySelectorAll('.order li')[j]?.querySelector('button'); if (b) b.focus(); },
  'chrono-check': () => { const x = S.ui.quiz.items[S.ui.quiz.i]; answerItem(x, x.cur.every((v, i) => v === x.it.items[i])); render(); focusNext(); },
  'ev-mark': (el) => { const x = S.ui.quiz.items[S.ui.quiz.i]; answerItem(x, el.dataset.ok === '1'); render(); focusNext(); },
  'flash-start': (el) => {
    const t = curTopic(); const st = P(['flash', t.id]); const set = el.dataset.set;
    let ids = t.flashcards.map((c) => c.id);
    if (set === 'due') ids = shuffle(ids.filter((id) => isDue(st[id]))).slice(0, 20);
    if (set === 'pinned') ids = ids.filter((id) => st[id] && st[id].pinned);
    if (set === 'missed') ids = ids.filter((id) => st[id] && st[id].lastMiss);
    if (set === 'all') ids = shuffle(ids);
    const h = document.getElementById('hintsOn'); if (h) S.ui.hints = h.checked;
    S.ui.flash = { tid: t.id, queue: ids, i: 0, flipped: false, hint: false, got: 0, missed: 0, missedOnce: {} }; render(); document.getElementById('flipbtn')?.focus();
  },
  'flash-exit': () => { S.ui.flash = null; render(); },
  flip: () => { const f = S.ui.flash; if (!f || f.flipped) return; f.flipped = true; render(); document.getElementById('gotbtn')?.focus(); },
  hint: () => { S.ui.flash.hint = true; render(); document.getElementById('flipbtn')?.focus(); },
  'flash-mark': (el) => {
    const f = S.ui.flash; const t = curTopic(); const id = f.queue[f.i]; const st = cardState(t.id, id) || { box: 0 };
    const ok = el.dataset.ok === '1';
    if (ok) {
      const box = f.missedOnce[id] ? 1 : Math.min((st.box || 0) + 1, 5);
      setCard(t.id, id, { box, due: Date.now() + BOX_DAYS[box] * 864e5 - 3600e3, got: (st.got || 0) + 1, seen: true, lastMiss: !!f.missedOnce[id] });
      if (!f.missedOnce[id]) f.got++;
    } else {
      setCard(t.id, id, { box: 0, due: Date.now(), miss: (st.miss || 0) + 1, seen: true, lastMiss: true });
      if (!f.missedOnce[id]) f.missed++;
      f.missedOnce[id] = true; f.queue.push(id);
    }
    daily().cards++; persist();
    f.i++; f.flipped = false; f.hint = false; render(); document.getElementById('flipbtn')?.focus();
  },
  pin: (el) => { const t = curTopic(); const st = cardState(t.id, el.dataset.id) || {}; setCard(t.id, el.dataset.id, { pinned: !st.pinned }); render(); document.querySelector('.pin')?.focus(); },
  rag: (el) => { const t = curTopic(); const ck = P(['check', t.id]); ck[el.dataset.id] = ck[el.dataset.id] === el.dataset.v ? undefined : el.dataset.v; if (!ck[el.dataset.id]) delete ck[el.dataset.id]; persist(); render(); document.querySelector(`[data-act="rag"][data-id="${el.dataset.id}"][data-v="${el.dataset.v}"]`)?.focus(); },
  'exam-mode': (el) => { S.ui.exam.mode = el.dataset.v; render(); },
  'exam-level': (el) => { S.ui.exam.level = el.dataset.v; render(); },
  'frame-level': (el) => { S.ui.frameLevel = el.dataset.v; render(); },
  timer: (el) => {
    clearInterval(S.ui.timerId); const end = Date.now() + +el.dataset.min * 60e3; S.ui.timer = { key: S.ui.exam.key, end };
    const tick = () => { const sp = document.getElementById('timer'); if (!sp) { clearInterval(S.ui.timerId); return; } const left = Math.max(0, end - Date.now()); sp.textContent = left ? `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')} left` : 'Time is up — finish your sentence.'; if (!left) clearInterval(S.ui.timerId); };
    S.ui.timerId = setInterval(tick, 1000); tick();
  },
  'sub-save': () => saveAnswer(false),
  'sub-send': () => saveAnswer('send'),
  'sub-feedback': () => saveAnswer(true),
  'g-start': (el) => { const r = parseRoute(); const c = courseOf(r.a); const topics = c ? courseTopics(c).map((t) => S.topics[t.id]).filter(Boolean) : [S.topics[r.a]]; startGame(r.a, topics, el.dataset.v); },
  'g-ans': (el) => gameAnswer(+el.dataset.v),
  'g-flip': (el) => memoryFlip(+el.dataset.v),
  'g-quit': () => { clearInterval(S.ui.gameTimer); S.ui.game = null; render(); },
  wcheck: () => {
    const text = (document.getElementById('answer') || {}).value || '';
    if (wordsIn(text) < 15) { examMsg('Write at least a few sentences first.', true); return; }
    const t = curTopic(); const c = courseOf(t.course); const q = resolveQ(c, t.exam.questions.find((x) => x.id === parseRoute().c));
    S.ui.exam.text = text; lsSet('hub-draft-' + S.ui.exam.key, text);
    S.ui.check = { key: S.ui.exam.key, r: writingCheck(q, text, c) }; render(); document.getElementById('checkout')?.scrollIntoView();
  },
  'ai-prompt': async () => {
    const text = (document.getElementById('answer') || {}).value || '';
    if (wordsIn(text) < 15) { examMsg('Write your answer first.', true); return; }
    const t = curTopic(); const c = courseOf(t.course); const q = resolveQ(c, t.exam.questions.find((x) => x.id === parseRoute().c));
    lsSet('hub-draft-' + S.ui.exam.key, text);
    const p = feedbackPrompt(c, t, q, text); const ok = await copyText(p);
    const box = document.getElementById('aiprompt');
    if (box) box.innerHTML = fmt(html`<div class="panel" style="gap:10px"><p><strong>${ok ? 'Copied!' : 'Copy the text below.'}</strong> Now open ${AI_TOOL.name}, sign in with your <b>school</b> Google account, paste (Ctrl+V or long-press, Paste) and send.</p>
      <p class="row" style="gap:8px"><a class="btn primary" href="${AI_TOOL.url}" target="_blank" rel="noopener">Open ${AI_TOOL.name}</a></p>
      <details class="fold"><summary>Show the feedback request</summary><div><textarea readonly rows="8" style="width:100%">${p}</textarea></div></details>
      <p class="small muted">Only use an AI tool your school allows for your age. Do not add your name or other personal details. Act on the feedback, then redraft here and check again.</p></div>`);
  },
  'sub-load': (el) => { const s = S.subs.find((x) => x.id === el.dataset.id); Object.assign(S.ui.exam, { subId: s.id, parentId: s.parent_id, text: s.text }); render(); document.getElementById('answer')?.focus(); },
  'sub-redraft': (el) => { const s = S.subs.find((x) => x.id === el.dataset.id); Object.assign(S.ui.exam, { subId: null, parentId: s.id, text: s.text, mode: 'supported' }); render(); const a = document.getElementById('practice'); a?.scrollIntoView(); document.getElementById('answer')?.focus(); },
  'sub-del': async (el) => {
    const id = el.dataset.id; if (S.ui.confirmDel !== id) { S.ui.confirmDel = id; render(); return; }
    S.ui.confirmDel = null;
    try { await Store.deleteSub(id); S.subs = S.subs.filter((x) => x.id !== id); if (S.ui.exam && S.ui.exam.subId === id) S.ui.exam.subId = null; render(); toast('Deleted'); } catch (e) { toast(e.message); }
  },
  mydata: async () => { try { download('my-history-hub-data.json', await Store.myData()); } catch (e) { toast(e.message); } },
  'reset-preview': () => { if (!S.ui.confirmReset) { S.ui.confirmReset = true; render(); return; } S.ui.confirmReset = false; S.progress = {}; S.subs = []; try { localStorage.removeItem('hub-preview-progress'); localStorage.removeItem('hub-preview-subs'); } catch {} render(); toast('Preview progress erased'); },
  logout: async () => { try { await Store.logout(); } catch {} S.user = null; S.progress = {}; S.subs = null; S.teacher = {}; S.topics = {}; lastTopicPromise = {}; history.replaceState(null, '', location.pathname); render(); },
  // teacher
  trefresh: (el) => { S.teacher[el.dataset.k] = null; render(); },
  copy: async (el) => { const t = document.getElementById(el.dataset.src).textContent; try { await navigator.clipboard.writeText(t); toast('Copied'); } catch { const r = document.createRange(); r.selectNodeContents(document.getElementById(el.dataset.src)); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Selected — press Ctrl+C to copy'); } },
  'reset-code': async (el) => { try { const r = await Store.call('POST', `/api/teacher/students/${el.dataset.id}/reset-code`); S.teacher.made = [r]; render(); } catch (e) { tmsg(e.message, true); } },
  'export-student': async (el) => { try { download(`student-${el.dataset.u}.json`, await Store.call('GET', `/api/teacher/students/${el.dataset.id}/export`)); } catch (e) { tmsg(e.message, true); } },
  'del-student': async (el) => {
    const id = el.dataset.id; if (S.ui.confirmDel !== id) { S.ui.confirmDel = id; render(); return; }
    S.ui.confirmDel = null; try { await Store.call('DELETE', `/api/teacher/students/${id}`); S.teacher.students = null; S.teacher.subs = null; render(); toast('Student and all their data deleted'); } catch (e) { tmsg(e.message, true); }
  },
  'edit-content': async (el) => { try { const r = await Store.call('GET', '/api/teacher/content/' + encodeURIComponent(el.dataset.id)); S.teacher.editing = r; render(); document.getElementById('cj')?.focus(); } catch (e) { tmsg(e.message, true); } },
  'edit-close': () => { S.teacher.editing = null; render(); },
  'export-content': async () => {
    try { const list = await Store.call('GET', '/api/teacher/content'); const items = []; for (const c of list.items) items.push(await Store.call('GET', '/api/teacher/content/' + encodeURIComponent(c.id))); download(`history-hub-content-${today()}.json`, { format: 'history-hub-content', exported_at: new Date().toISOString(), items }); } catch (e) { tmsg(e.message, true); }
  },
  'export-progress': async () => { try { download(`history-hub-progress-${today()}.json`, await Store.call('GET', '/api/teacher/progress')); } catch (e) { tmsg(e.message, true); } },
  backup: async () => { try { download(`history-hub-backup-${today()}.json`, await Store.call('GET', '/api/teacher/backup')); } catch (e) { tmsg(e.message, true); } },
  'restore-cancel': () => { S.teacher.pendingRestore = null; render(); },
  'restore-go': async () => { try { await Store.call('POST', '/api/teacher/restore', S.teacher.pendingRestore); S.teacher = {}; S.user = null; S.ui.loginError = 'Backup restored. Please sign in again.'; render(); } catch (e) { tmsg(e.message, true); } }
};
function focusNext() { document.getElementById('nextbtn')?.focus(); }

async function saveAnswer(withFeedback) {
  const ui = S.ui.exam; const [tid, , qid] = [parseRoute().a, null, parseRoute().c];
  const text = document.getElementById('answer').value;
  if (!text.trim()) { examMsg('Write your answer first.', true); return; }
  try {
    let sub;
    const existing = ui.subId && S.subs.find((x) => x.id === ui.subId);
    if (existing && (existing.status === 'draft' || existing.status === 'error')) sub = await Store.updateSub(ui.subId, text);
    else sub = await Store.createSub({ topic_id: tid, question_id: qid, text, parent_id: ui.parentId || undefined });
    S.subs = [sub, ...S.subs.filter((x) => x.id !== sub.id)];
    ui.subId = sub.id; ui.text = text;
    if (!withFeedback) { render(); examMsg(PREVIEW ? 'Saved in this browser.' : 'Draft saved. Only you can see it until you send it or ask for feedback.'); return; }
    if (withFeedback === 'send') {
      try { const sent = await Store.submitSub(sub.id); S.subs = [sent, ...S.subs.filter((x) => x.id !== sent.id)]; ui.subId = null; ui.parentId = null; ui.text = ''; lsSet('hub-draft-' + ui.key, ''); render(); examMsg('Sent to Mr Garry.'); }
      catch (e) { render(); examMsg(e.message, true); }
      return;
    }
    examMsg('Preparing feedback… this can take up to a minute. Your answer is already saved.');
    const btns = document.querySelectorAll('[data-act="sub-feedback"],[data-act="sub-save"]'); btns.forEach((b) => b.disabled = true);
    try {
      const marked = await Store.feedback(sub.id);
      S.subs = [marked, ...S.subs.filter((x) => x.id !== marked.id)];
      ui.subId = null; ui.parentId = null; ui.text = ''; lsSet('hub-draft-' + ui.key, '');
      render(); document.querySelector('.fb')?.scrollIntoView();
    } catch (e) {
      try { const r = await Store.submissions(); S.subs = r.submissions; S.ai = r.ai; } catch {}
      render(); examMsg(e.message, true);
    }
  } catch (e) { examMsg('Not saved: ' + e.message + ' Your text is still kept on this device.', true); }
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el || !root.contains(el) && !el.closest('.overlay')) return;
  const fn = A[el.dataset.act]; if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase(); const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
  if (e.key === '/' && !typing && S.user && !document.querySelector('.overlay')) { e.preventDefault(); openSearch(); }
  if (S.ui.flash && !typing && (e.key === ' ' || e.key === 'Enter') && e.target.classList.contains('flash')) { e.preventDefault(); A.flip(); }
});
let typeTimer = null;
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'answer') {
    S.ui.exam.text = el.value; lsSet('hub-draft-' + el.dataset.key, el.value);
    const wc = document.getElementById('wc'); if (wc) wc.textContent = `${wordsIn(el.value)} words · draft kept on this device as you type`;
  } else if (el.dataset.plan) { P(['notes', curTopic().id, 'plan'])[el.dataset.plan] = el.value; clearTimeout(typeTimer); typeTimer = setTimeout(persist, 600); }
  else if (el.dataset.stretch) { P(['notes', curTopic().id, 'stretch'])[el.dataset.stretch] = el.value; clearTimeout(typeTimer); typeTimer = setTimeout(persist, 600); }
  else if (el.id === 'hintsOn') S.ui.hints = el.checked;
});
document.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.id === 'hintsOn') S.ui.hints = el.checked;
  if (el.dataset && el.dataset.ppf && S.ui.pp) { S.ui.pp[el.dataset.ppf] = el.value; render(); return; }
  if (el.id === 'imp' && el.files[0]) {
    try {
      const data = JSON.parse(await el.files[0].text());
      let id; if (Array.isArray(data.courses)) id = 'courses'; else if (data.id && data.course) id = 'topic:' + data.id; else throw new Error('This file is not a topic or course file.');
      await Store.call('PUT', '/api/teacher/content/' + encodeURIComponent(id), { data, status: 'draft' });
      S.teacher.content = null; render(); tmsg(`Imported ${id} as a draft. Publish it when ready.`);
    } catch (err) { tmsg('Import failed: ' + err.message, true); }
  }
  if (el.id === 'restore' && el.files[0]) {
    try { const b = JSON.parse(await el.files[0].text()); if (b.format !== 'history-hub-backup') throw new Error('Not a History Department website backup.'); S.teacher.pendingRestore = b; render(); } catch (err) { tmsg(err.message, true); }
  }
});
document.addEventListener('submit', async (e) => {
  const f = e.target; e.preventDefault();
  if (f.id === 'loginform') {
    try { S.user = await Store.login(f.querySelector('#lu').value, f.querySelector('#ls').value); S.ui.loginError = null; await boot(); }
    catch (err) { S.ui.loginError = err.message; render(); document.getElementById('lu')?.focus(); }
    return;
  }
  const kind = f.dataset.form; const qs = S.ui.quiz;
  if (kind === 'short') { const x = qs.items[qs.i]; x.given = f.querySelector('#sa').value; if (!x.given.trim()) return; answerItem(x, shortMatch(x.given, x.it.accept)); render(); focusNext(); }
  if (kind === 'match') { const x = qs.items[qs.i]; x.picks = x.it.pairs.map((_, i) => f.querySelector('#m' + i).value); x.score = x.it.pairs.filter((p, i) => x.picks[i] === p[1]).length; answerItem(x, x.score === x.it.pairs.length); render(); focusNext(); }
  if (kind === 'evidence') { const x = qs.items[qs.i]; x.given = f.querySelector('#ev').value; if (!x.given.trim()) return; const g = ' ' + norm(x.given) + ' '; x.hit = x.it.keywords.every((grp) => grp.some((k) => g.includes(norm(k)))); x.revealed = true; render(); document.querySelector('[data-act="ev-mark"]')?.focus(); }
  if (kind === 'review') {
    try {
      await Store.call('PUT', `/api/teacher/submissions/${f.dataset.id}/review`, { mark: f.querySelector('#rv-m').value, max: f.querySelector('#rv-x').value, level: f.querySelector('#rv-l').value, comment: f.querySelector('#rv-c').value, overrides_ai: f.querySelector('#rv-o').checked });
      S.teacher.subs = null; go('teacher'); toast('Review saved');
    } catch (err) { tmsg(err.message, true); }
  }
  if (kind === 'mkstudents') {
    const students = f.querySelector('#mk').value.split('\n').map((l) => l.split(',').map((x) => x.trim())).filter((x) => x[0]).map(([username, cls]) => ({ username, class: cls }));
    try { const r = await Store.call('POST', '/api/teacher/students', { students }); S.teacher.made = r.created; S.teacher.students = null; render(); } catch (err) { tmsg(err.message, true); }
  }
  if (kind === 'scheme') {
    const get = (n) => f.querySelector(`[name="${n}"]`);
    const parseScheme = () => {
      const levels = get('levels').value.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((x) => x[0]).map(([level, marks, ...d]) => ({ level, marks, descriptor: d.join(' | ') }));
      const max = get('max').value === '' ? null : +get('max').value;
      const verified = get('verified').checked;
      if (verified && (!Number.isFinite(max) || max <= 0 || !levels.length)) { tmsg('A verified mark scheme needs a maximum mark and at least one level.', true); return undefined; }
      const empty = !get('source').value && max == null && !levels.length;
      return empty ? null : { verified, source: get('source').value, max_marks: max, levels, notes: get('notes').value || undefined, indicative_content: get('indicative').value.split('\n').map((x) => x.trim()).filter(Boolean), ao_separate: get('ao').checked };
    };
    if (f.dataset.c) {
      const ms = parseScheme(); if (ms === undefined) return;
      try {
        const cur = await Store.call('GET', '/api/teacher/content/courses');
        const course = cur.data.courses.find((x) => x.id === f.dataset.c);
        course.qtypes[f.dataset.k].markscheme = ms;
        await Store.call('PUT', '/api/teacher/content/courses', { data: cur.data, status: cur.status });
        S.catalog = await Store.catalog(); render(); tmsg('Mark scheme saved.'); window.scrollTo(0, 0);
      } catch (err) { tmsg(err.message, true); }
      return;
    }
    const t = S.topics[f.dataset.t]; const q = t.exam.questions.find((x) => x.id === f.dataset.q);
    const levels = get('levels').value.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((x) => x[0]).map(([level, marks, ...d]) => ({ level, marks, descriptor: d.join(' | ') }));
    const max = get('max').value === '' ? null : +get('max').value;
    const verified = get('verified').checked;
    if (verified && (!Number.isFinite(max) || max <= 0 || !levels.length)) { tmsg('A verified mark scheme needs a maximum mark and at least one level.', true); return; }
    const empty = !get('source').value && max == null && !levels.length;
    q.markscheme = empty ? null : { verified, source: get('source').value, max_marks: max, levels, indicative_content: get('indicative').value.split('\n').map((x) => x.trim()).filter(Boolean), ao_separate: get('ao').checked };
    if (q.markscheme && verified) t.exam.criteria_status = t.exam.questions.every((x) => x.markscheme && x.markscheme.verified) ? 'verified' : t.exam.criteria_status;
    try {
      const cur = await Store.call('GET', '/api/teacher/content/' + encodeURIComponent('topic:' + t.id));
      await Store.call('PUT', '/api/teacher/content/' + encodeURIComponent('topic:' + t.id), { data: t, status: cur.status });
      tmsg('Mark scheme saved.'); window.scrollTo(0, 0);
    } catch (err) { tmsg(err.message, true); }
  }
  if (kind === 'content') {
    let data; try { data = JSON.parse(f.querySelector('#cj').value); } catch (err) { tmsg('That is not valid JSON: ' + err.message, true); return; }
    try { await Store.call('PUT', '/api/teacher/content/' + encodeURIComponent(f.dataset.id), { data, status: f.querySelector('#cs').value }); S.teacher.content = null; S.teacher.editing = null; S.topics = {}; lastTopicPromise = {}; S.catalog = await Store.catalog(); await loadAllTopics(); render(); tmsg('Saved.'); } catch (err) { tmsg(err.message, true); }
  }
  if (kind === 'settings') {
    const b = {}; f.querySelectorAll('input[name]').forEach((i) => { b[i.name] = i.type === 'checkbox' ? i.checked : i.type === 'number' ? (i.value === '' ? null : +i.value) : i.value; });
    try { S.teacher.settings = await Store.call('PUT', '/api/teacher/settings', b); render(); tmsg('Settings saved.'); } catch (err) { tmsg(err.message, true); }
  }
  if (kind === 'password') {
    try { await Store.call('POST', '/api/teacher/password', { current: f.querySelector('#pw1').value, next: f.querySelector('#pw2').value }); f.reset(); tmsg('Password changed.'); } catch (err) { tmsg(err.message, true); }
  }
});

// ---------- boot ----------
async function loadAllTopics() { await Promise.all(Object.keys(S.catalog.topics).map((id) => ensureTopic(id).catch(() => null))); }
async function boot() {
  try {
    if (!S.user) S.user = await Store.me();
    if (!S.user) { render(); return; }
    S.catalog = await Store.catalog(); S.ai = S.catalog.ai;
    if (S.user.role === 'student') S.progress = (await Store.loadProgress()) || {};
    await loadAllTopics();
    render();
  } catch (e) {
    root.innerHTML = fmt(html`<main><div class="notice bad">The History Department website could not load: ${e.message}. Check your connection and refresh.</div></main>`);
  }
}
const th = lsGet('hub-theme', null); if (th) document.documentElement.dataset.theme = th;
boot();
})();
