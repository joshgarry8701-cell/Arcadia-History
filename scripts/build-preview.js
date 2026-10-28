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
const body = (note) => `<title>Arcadia British School History Department</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@500;600&display=swap">
<style>
${read('public/styles.css')}
</style>
<div id="app"><main><p style="padding:24px">Loading the History Department website…</p></main></div>
<script>window.HUB_PREVIEW = ${safe(JSON.stringify({ courses, topics, note, photo: 'data:image/webp;base64,' + fs.readFileSync(path.join(root, 'public/mr-garry.webp')).toString('base64'), badge: 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'public/arcadia-badge.png')).toString('base64') }))};</script>
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
<meta name="description" content="Arcadia British School History Department, Dubai. Learn, quizzes, flashcards, checklists and exam practice for Years 7–13.">
<link rel="icon" type="image/png" href="data:image/png;base64,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">
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
