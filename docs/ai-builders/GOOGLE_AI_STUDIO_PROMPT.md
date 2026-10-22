# Building the Revision Hub in Google AI Studio

Google AI Studio's **Build** mode creates a React web app from a prompt and can call Gemini. It is quick for a working demo.

## Read this first: what AI Studio is good for

- **It is fine for:** trying out the design and the revision features (Learn, quizzes, flashcards, checklists, exam guides, writing frames). In a demo these can save progress in the browser.
- **It needs extra work before real students use it:** sign-in, private submissions and AI marking need a server. AI Studio can deploy to Google Cloud Run, and the Gemini key must then be held on the server, never in the browser code. A shareable AI Studio app is not a substitute for a school deployment with accounts and privacy controls.
- Never put real student names or work into AI Studio while you are building.

## Steps

1. Open AI Studio and choose **Build**.
2. Attach these files to the prompt if your version lets you: `PRODUCT_SPEC.md`, `content/all-content.json` and `assets/mr-garry.png`. If it won't accept the JSON (it is large), start the app first, then open the code panel, create `src/content/all-content.json` and paste the file in.
3. Paste the main prompt below.
4. Then paste the follow-up prompts one at a time.

---

## Main prompt

```
Build "Mr Garry's History Revision Hub", a responsive revision website for History students at Arcadia British School Dubai (Years 7–13: KS3, Pearson Edexcel International GCSE and International A Level). Follow the attached PRODUCT_SPEC.md. It is the source of truth.

Content: load everything from src/content/all-content.json ({ courses, topics }), described in section 9 of the spec. Never hard-code course content. A topic exam question with a "qtype" inherits all the fields of course.qtypes[qtype].

Build now:
1. Design (spec section 8): Bricolage Grotesque headings, Atkinson Hyperlegible body text, IBM Plex Mono chips, light and dark themes with a toggle, the header with an "M" logo, and course accent colours from the data.
2. Home: a hero with the attached photo of me (circular, alt "Mr Garry, History teacher at Arcadia British School Dubai"), the eyebrow "History · Key Stage 3 to International A Level", the heading "Choose your year", the subtitle "Learn the content, test your memory, practise your writing and act on feedback.", and year cards 7–13 with a "N topics ready" or "Coming soon" chip.
3. Course page: topic cards grouped by area, an "About the exam" panel, and links to the Exam guide, a Mixed quiz and a Key dates quiz.
4. Exam guide: one card per question type with the template, what it asks, steps, timing, success criteria, a mark-scheme level table, common mistakes, "What examiners said" (strong answers and weaknesses), writing frames as numbered sentence starters, and annotated models (text plus an italic note).
5. Topic page with tabs Overview, Learn, Quizzes, Flashcards, Checklist, Exam practice, Writing frames and Stretch, exactly as in spec section 2.4. Include Leitner spaced-review flashcards with pins, red/amber/green checklist ratings with Bloom colours (describe red, explain amber, judge green), and quizzes of every type in the data.
6. Exam question page: question, sources if any, a missing-sources notice, guide sections, a frame chooser, a text area with word count, and Save draft. Save progress and drafts in localStorage for now.
7. Department rules: PEEJ paragraphs (never SPEND), the factor frame with criteria duration, scope, effectiveness and impact, and a stretch task on every activity.
8. Show "Written for this site and awaiting Mr Garry's check" on topics whose review.state is "awaiting-teacher-check".
9. Mobile first: no horizontal scroll at 375px.
```

## Follow-up 1: AI feedback with Gemini, server-side

```
Add AI feedback to the exam question page following PRODUCT_SPEC.md section 5, using Gemini.
- The Gemini call must run on the server (an API route or server function), with the key from an environment variable. Students never enter a key, and it must not appear in client code.
- Use indicative mode (with a mark) only when the question's markscheme.verified is true and its sources are present or not needed. Otherwise use formative mode with no mark.
- Ask Gemini for the JSON shape in the spec (use structured output or a response schema if available). Then validate it: keep only quotes that appear word for word in the student's answer, clamp the mark to the range, and drop marks in formative mode.
- Enforce limits on the server: 900 words, 3 feedback requests per student per day, 60 seconds between requests, 2 redrafts per answer, and a monthly spending ceiling.
- If the call fails, keep the draft and show the reason. Never invent feedback.
- Show "Indicative mark — your teacher may change it" or "Formative feedback — no mark", then strengths, corrections, the top 3 improvements, an example improvement and a redraft task.
```

## Follow-up 2: accounts and Teacher area (for real use)

```
Add real accounts and a Teacher area following PRODUCT_SPEC.md sections 1, 2.6, 6 and 7. Use Firebase Authentication with Firestore (or Cloud SQL) and Security Rules so that:
- students sign in with a username and a teacher-issued code (no email collected)
- a student can read and write only their own progress and submissions; only the teacher can read everyone's
- the teacher can create students in bulk, reset codes, export and delete student data, review and override AI feedback, tick mark schemes as checked, edit and publish content, and download and restore backups.
```

## Follow-up 3: search and checks

```
Add search ("/" shortcut) across topic titles, Learn text, vocabulary, people and timeline. Then test at 375px width and in dark mode, and fix any layout problems.
```

---

If the AI Studio version drifts from the spec, the working reference version in `reference-code/` shows exactly how every feature behaves.
