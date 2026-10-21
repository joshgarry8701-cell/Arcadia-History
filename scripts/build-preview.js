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
const out = `<title>Mr Garry's History Revision Hub</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@500;600&display=swap">
<style>
${read('public/styles.css')}
</style>
<div id="app"><main><p style="padding:24px">Loading the Revision Hub…</p></main></div>
<script>window.HUB_PREVIEW = ${safe(JSON.stringify({ courses, topics, photo: 'data:image/webp;base64,' + fs.readFileSync(path.join(root, 'public/mr-garry.webp')).toString('base64') }))};</script>
<script>
${safe(read('public/app.js'))}
</script>
`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/preview.html'), out);
console.log('Wrote dist/preview.html', (out.length / 1024).toFixed(0) + ' KB');
