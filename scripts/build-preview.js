// Builds dist/preview.html: a single self-contained page of the student experience
// (content bundled in, progress kept in the browser, no sign-in, teacher tools or AI feedback).
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const courses = JSON.parse(read('content/courses.json'));
const topics = {};
for (const f of fs.readdirSync(path.join(root, 'content/topics')).filter((x) => x.endsWith('.json'))) {
  const t = JSON.parse(read('content/topics/' + f));
  if (t.status !== 'published') continue;
  for (const q of t.exam.questions) q.markscheme = q.markscheme ? { verified: !!q.markscheme.verified, max_marks: q.markscheme.max_marks } : null;
  topics[t.id] = t;
}
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
const body = (note) => `<title>Mr Garry's History Revision Hub</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@500;600&display=swap">
<style>
${read('public/styles.css')}
</style>
<div id="app"><main><p style="padding:24px">Loading the Revision Hub…</p></main></div>
<script>window.HUB_PREVIEW = ${safe(JSON.stringify({ courses, topics, note, photo: 'data:image/webp;base64,' + fs.readFileSync(path.join(root, 'public/mr-garry.webp')).toString('base64') }))};</script>
<script>
${safe(read('public/app.js'))}
</script>
`;
const out = body(undefined);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/preview.html'), out);
console.log('Wrote dist/preview.html', (out.length / 1024).toFixed(0) + ' KB');

// Student website for GitHub Pages (or any static host): a complete HTML document.
const studentNote = 'Your progress is saved on this device and browser only, so use the same device each time. On any practice question, use Check my writing for instant feedback, or Get AI feedback to send your answer to Gemini with your school account.';
const site = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Mr Garry's History Revision Hub — Arcadia British School Dubai. Learn, quizzes, flashcards, checklists and exam practice for Years 7–13.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%2322468e'/%3E%3Ctext x='16' y='23' font-size='19' font-family='Arial' font-weight='700' fill='white' text-anchor='middle'%3EM%3C/text%3E%3C/svg%3E">
${body(studentNote).replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '').replace(/^<title>(.*)<\/title>\n/, '<title>$1</title>\n</head>\n<body>\n')}
</body>
</html>
`;
fs.mkdirSync(path.join(root, 'dist/site'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/site/index.html'), site);
fs.writeFileSync(path.join(root, 'dist/site/.nojekyll'), '');
// Copies for GitHub Pages: works whether Pages serves gh-pages, main / (root) or main /docs
for (const dir of ['', 'docs']) {
  fs.writeFileSync(path.join(root, dir, 'index.html'), site);
  fs.writeFileSync(path.join(root, dir, '.nojekyll'), '');
}
console.log('Wrote dist/site/index.html', (site.length / 1024).toFixed(0) + ' KB');
