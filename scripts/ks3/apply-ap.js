#!/usr/bin/env node
// Applies the KS3 AP-style exam practice (scripts/ks3/ap.js) to every Year 7–9 topic file,
// including hand-made topics such as y7-hastings. Safe to run again.
// Usage: node scripts/ks3/apply-ap.js
'use strict';
const fs = require('fs');
const path = require('path');
const { apply } = require('./ap');
const dir = path.join(__dirname, '..', '..', 'content', 'topics');
let n = 0;
for (const f of fs.readdirSync(dir).filter((x) => /^y[789]-.*\.json$/.test(x))) {
  const file = path.join(dir, f);
  const t = JSON.parse(fs.readFileSync(file, 'utf8'));
  apply(t);
  fs.writeFileSync(file, JSON.stringify(t, null, 2) + '\n');
  n++;
}
console.log(`KS3 AP exam practice applied to ${n} topics.`);
