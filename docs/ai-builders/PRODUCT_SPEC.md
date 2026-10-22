# Product specification — Mr Garry's History Revision Hub

A responsive, interactive History revision website for students at Arcadia British School Dubai, run by their teacher, Mr Garry. It must be a real working website with real sign-in, real saving and real (server-side) AI feedback — never a mock-up, never simulated saving or marking.

All course content is supplied in `content/all-content.json` (shape described in section 9). The app must load content from that data, not hard-code it, so the teacher can update it.

---

## 1. Users and sign-in

| Role | How they sign in | Can do |
|---|---|---|
| Student | Username (e.g. `11a.amira`) + a code the teacher generates. No email, no personal data. | Revise, save progress, write answers, request AI feedback, see teacher reviews, export or delete their own data |
| Teacher (Mr Garry) | Username + password (set at deploy time) | Everything students can see, plus the Teacher area |

- Sessions: secure HttpOnly cookie (or Supabase Auth session). Codes and passwords are hashed.
- Student data kept to the minimum: username, class, optional display name, progress, submissions.
- Teacher creates students in bulk (paste `username, class` lines); codes are shown once; teacher can reset a code (signs the student out everywhere), export one student's data, or delete a student permanently (cascades to progress and submissions).

## 2. Pages (routes)

1. **Home** — hero with Mr Garry's photo (circular), eyebrow "History · Key Stage 3 to International A Level", heading "Choose your year", subtitle "Learn the content, test your memory, practise your writing and act on feedback." Grid of year cards 7, 8, 9, 10, 11, 12, 13: big coloured year number (course accent colour), course title, enquiry line, and a chip "N topics ready" or "Coming soon".
2. **Course page** — course title and areas (e.g. Paper 1 Germany, Paper 1 Civil Rights). Three action cards: *Exam guide*, *Mixed quiz* (questions from every topic), *Key dates quiz* (timeline events from every topic). Topic cards grouped by area, each showing key-topic label, title, flashcards mastered and best quiz score with a progress bar. "About the exam" panel: board, qualification, spec version, each paper's structure, assessment objectives (folded), nominated source areas (folded), where details come from (folded). Teacher-only panel: conflicts found in documents and open questions. Resources received / still needed.
3. **Exam guide** — for each paper, each question type: chips (paper, marks, minutes, AOs); "How the question is worded"; folds for: what it asks, step-by-step approach, planning and timing, assessment criteria + mark-scheme level table, common mistakes, **what examiners said** (strong answers / common weaknesses / link to report), writing frame(s), annotated model; list of practice questions of this type across the course.
4. **Topic page** with tabs:
   - **Overview** — intro, progress summary, checklist summary, links to each tab.
   - **Learn** — sections with paragraphs/bullets, key terms, "precise evidence" box, read-more references; then timeline, key people, vocabulary, misconceptions (wrong → right).
   - **Quizzes** — multiple choice (with explanation after answering), short answer (accepts listed alternatives, case-insensitive, ignores punctuation), chronology (drag or tap to order), matching, evidence recall (keyword check against a model). Score saved; best score shown.
   - **Flashcards** — flip cards with hint; "pin" a card; spaced review (Leitner boxes: Again / Hard / Good / Easy move a card between boxes 1–5 with review intervals 0, 1, 3, 7, 14 days); "due today" count; mastered = box 5.
   - **Checklist** — personal learning checklist; each "I can…" statement has a Bloom level colour (**describe = red, explain = amber, judge = green**) and the student rates it Red / Amber / Green; link to the relevant Learn section.
   - **Exam practice** — list of questions with chips (question type, marks, minutes, label e.g. "Past paper: 4HI1/02, June 2025, A4(a)" or "Teacher-created practice question"). Question page: question text; sources with provenance if supplied; notice if the question needs sources/extracts not on the site; guide folds (as exam guide); writing frame chooser (full sentence starters / headings only / no frame); text area with live word count and autosave; buttons *Save draft*, *Get AI feedback*, *Redraft*; history of attempts; teacher review shown when present.
   - **Writing frames** — all frames for the topic's question types with sentence starters.
   - **Stretch** — stretch and challenge tasks (every activity has one).
5. **Search** — press `/` or click Search; searches topic titles, Learn text, vocabulary, people, timeline.
6. **Teacher area** — tabs: Students; Progress (per class/student/topic: flashcards mastered, quiz scores, checklist RAG counts); Submissions (filter, open, review: edit mark, max, comment, override AI, save — student then sees "Mr Garry's review"); Mark schemes (per course question type: check wording, tick "I have checked this" → indicative marks enabled); Content (list, edit JSON, change status draft/published, import a topic or course file, validate before saving); AI and limits; Backup and export (download full backup JSON; restore with confirmation); Change password.
7. **My data** (student) — download all my data; delete my submissions.

Dark mode toggle (respects system setting). Fully usable on a phone (no horizontal scroll at 375 px).

## 3. Department teaching rules (must be built in)

- Paragraph structure is **PEEJ** (Point, Evidence, Explain, Judge). **Never SPEND.** Evidence tip: SPEDA (statistics, key people, events, dates, acts/laws).
- Essay and factor questions use the **department factor-question frame** with judgement criteria **duration, scope, effectiveness, impact**.
- Checklist and learning objectives follow Bloom levels coloured **red (describe), amber (explain), green (make a judgement)**.
- **Every activity has a stretch and challenge task.**
- Year 10 Germany / Civil Rights (International GCSE) are separate from Year 12 Germany / Year 13 Civil Rights (International A Level). Never mix their questions or mark schemes.

## 4. Content honesty rules

- Exam requirements come only from Pearson specifications, mark schemes, and examiner reports; never invent them. If something is unknown, show "not yet confirmed".
- A question is labelled "Past paper" only when the series is verified (already done in the data). All others say "Teacher-created practice question".
- Sources show real provenance. Never present invented quotations as authentic. Model answers are labelled illustrative.
- Show "Written for this site and awaiting Mr Garry's check" on topics whose `review.state` is `awaiting-teacher-check`.
- Do not reproduce textbooks; the data is original writing.

## 5. AI feedback (server-side only)

Flow when a student clicks *Get AI feedback*:

1. Server checks: AI switched on; API key present in server secret; token prices entered; monthly spending ceiling not reached (reserve the **worst-case** cost of this call before calling); student's daily limit (default 3); cooldown (60 s); word limit (900); redraft limit (2 per answer).
2. Resolve the question: merge the question with its course question type (`courses[].qtypes[q.qtype]`) — this gives marks, AOs, mark scheme, frame note, examiner advice.
3. Decide mode: **indicative** only if the question's mark scheme has `verified: true` (teacher ticked it) AND (the question does not need sources OR its sources are on the site). Otherwise **formative** (no mark).
4. Build the prompt: role (experienced Pearson Edexcel History examiner and supportive teacher), the question, sources text or "sources NOT available", the verified mark scheme (or "NOT AVAILABLE"), department approach (PEEJ, factor frame), examiner-report advice, relevant Learn content from the topic, previous attempt + previous priorities if a redraft, the student's answer.
5. Ask for JSON only:
```json
{ "mark": 0, "level": "", "ao_feedback": [{"ao": "AO1", "comment": ""}],
  "judgement_evidence": [{"quote": "exact words from the answer", "comment": ""}],
  "strengths": [""], "corrections": [{"issue": "", "fix": ""}], "improvements": [""],
  "example_improvement": {"original": "", "improved": ""}, "redraft_task": "",
  "comparison": "", "missing": [""] }
```
6. Validate before saving: keep only `judgement_evidence` quotes that really appear in the student's text; clamp the mark to 0..max (discard if invalid); max 4 strengths, 3 improvements; in formative mode remove mark and AO marks.
7. Record token usage and cost; show the student the feedback with "Indicative mark — your teacher may change it" or "Formative feedback — no mark".
8. If the provider fails or times out: keep the student's draft, show the reason, do not charge the budget beyond actual usage.
9. Teacher can review and override any feedback; the student sees the teacher review above the AI feedback.

Default model in the reference code: Anthropic `claude-sonnet-5-5` via the Messages API. Any provider is acceptable if the key is server-side and the ceiling is enforced.

## 6. Privacy and safety

- Submissions are private: a student can only read their own (enforce on the server / with Row-Level Security, not just in the UI). Teacher reads all.
- Students cannot call teacher endpoints (403).
- No analytics or third-party trackers. Fonts can come from Google Fonts.
- Export (student and teacher) and permanent deletion are real.
- Backups: teacher downloads a full JSON backup; restore replaces everything after confirmation.

## 7. Data model

```
users(id, username unique, role 'teacher'|'student', display, class, pass_hash, created_at)
sessions(token_hash, user_id, expires_at)            -- or use Supabase Auth
content(id, kind 'course'|'topic'|'courses', json, status 'draft'|'published', updated_at)
progress(user_id, json, updated_at)                  -- flashcard boxes/pins/due dates, quiz best scores, checklist RAG, drafts
submissions(id, user_id, topic_id, question_id, parent_id, text, status 'draft'|'submitted'|'marked',
            ai_json, ai_error, teacher_json, created_at, updated_at)
usage(id, user_id, at, input_tokens, output_tokens, cost_usd)
settings(key, value)  -- ai_enabled, ai_model, price_input_per_mtok, price_output_per_mtok, monthly_budget_usd (10),
                      -- max_output_tokens (1500), max_words (900), daily_marks_per_student (3), cooldown_seconds (60), max_resubmissions (2)
mark scheme verification: stored inside the course/topic JSON (markscheme.verified = true) when the teacher ticks it
```

## 8. Design

- Clean, calm and academic, and readable for every learner. Fonts (Google Fonts): **Bricolage Grotesque** for headings, **Atkinson Hyperlegible** for body text, **IBM Plex Mono** for mark and time chips.
- Light theme tokens: background `#f3f5f9`, surface `#ffffff`, sunk `#e9edf4`, ink `#17202f`, muted `#566176`, line `#d9dee8`, accent (navy) `#22468e`, focus ring `#f0a400`, radius 10px.
- Dark theme tokens: background `#0f131b`, surface `#171d28`, sunk `#1d2433`, ink `#e7ebf2`, muted `#a0aabb`, line `#2b3446`, accent `#8eb0f2`.
- Bloom / RAG colours: red `#b83227` (bg `#fbe9e7`), amber `#a8670c` (bg `#fdf1dc`), green `#2c7a4b` (bg `#e3f3e9`); dark: `#f08a7e`, `#f0b45a`, `#74c99a`.
- Header: navy "M" logo tile, "Mr Garry's · Arcadia British School Dubai" over "History Revision Hub"; right side: "Progress saved" status, Search, dark-mode toggle, Teacher/Account.
- Course accent colours (from the data `accent`): Y7 `#b4532a`, Y8 `#2f6f5e`, Y9 `#5b4a9e`, Y10 `#2c6e63`, Y11 `#1f5f8b`, Y12 `#7a2e3a`, Y13 `#8a6a12`. The accent colours the big year number, a left bar on page headings and the active tab.
- Notices (awaiting check, sources missing) sit in a soft amber box with an amber left border.
- Accessibility: visible focus, real buttons, `aria-current` on the active tab, and colour is never the only signal (RAG buttons carry text).
- Mobile first: no horizontal scroll at 375px; tabs wrap; tables scroll inside their own container.

## 9. Content data shape (`content/all-content.json`)

```
{ courses: [Course], topics: [Topic] }

Course {
  id: 'y7'|'y8'|...|'y13', year: 'Year 10', title, enquiry, stage, accent, separation_note,
  areas: [{ id, title, paper }],
  assessment?: { type, criteria_status, notes }           // KS3 only
  exam?: { verified, board, qualification, codes, specification_version,
           papers: [{ code, title, duration, marks, weighting, structure, qtypes: [qtypeKey] }],
           aos: [{ ao, text, weight }], source_focus?: { title, items[] },
           sources: [{ title, url?, note? }], conflicts?: [], open_questions?: [] },
  qtypes: { [key]: QuestionType },
  resources_received: [], resources_needed: []
}

QuestionType {
  label, paper, marks, minutes, ao, requires_sources?, template, asks,
  steps: [], plan, success: [], mistakes: [], criteria_list?: [], evidence_tip?, frame_note?,
  frame?: { full: [sentence starters], some: [headings] } | frames?: [{ name, full, some? }],
  model?: [{ t: text, n: annotation }], model_note?,
  markscheme: { verified: false, source, max_marks, ao_separate, levels: [{ level, marks, descriptor }] },
  examiner?: [{ series, url, strong: [], weak: [] }]
}

Topic {
  id: 'y10-de-1', course: 'y10', area: 'de', kt: 'Key topic 1', order, title, status, review: { state, note },
  learn: { intro, sections: [{ id: 's1', title, blocks: [{ p } | { ul: [] }], terms: [], evidence: [], refs?: [] }],
           timeline: [{ date, event }], people: [{ name, role }], vocab: [{ term, def }],
           misconceptions: [{ wrong, right }] },
  quizzes: { mcq: [{ id, s, q, options[], answer: index, why }], short: [{ id, s, q, accept[], answer }],
             chronology: [{ id, title, items[] in correct order }], matching: [{ id, title, pairs: [[left, right]] }],
             evidence: [{ id, s, q, keywords: [[...any of]], model }] },
  flashcards: [{ id, s, q, a, hint }],
  checklist: [{ id, level: 'describe'|'explain'|'judge', text: 'I can…', sections: ['s1'] }],
  exam: { questions: [{ id, qtype?, label, sections[], q, prompts?, sources?: [{ label, provenance, text }],
                        model?, model_note?,  /* Year 7: marks, type, asks, steps, plan, success, mistakes, frame, markscheme inline */ }] },
  stretch: [{ id, kind, task }]
}
```
A question with `qtype` inherits every field of that course question type; fields on the question override it.
