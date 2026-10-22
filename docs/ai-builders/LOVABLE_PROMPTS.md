# Building the Revision Hub in Lovable

Lovable builds a React site and can add a database, sign-in and server functions (Lovable Cloud or Supabase). It works best with **one focused prompt at a time**, so paste these in order and check each step in the preview before moving on.

## Before you start

1. Create a new Lovable project.
2. **Connect GitHub** (Project settings → GitHub) so the project has a repository. In that repository, add this pack's `content/all-content.json` as `src/content/all-content.json` and both photo files to `public/`. You can upload them on github.com with *Add file → Upload files*. Lovable syncs them into the project.
   - *No GitHub?* Attach the photo in the Lovable chat. For the content, attach `all-content.json` and ask Lovable to save it as `src/content/all-content.json`. It is large, so if Lovable refuses, use GitHub.
3. Keep `PRODUCT_SPEC.md` open. Prompt 1 asks Lovable to follow it, so attach it or paste it in.
4. Test only with made-up students. Don't type real student names into Lovable.

---

## Prompt 1: foundations and design

```
Build "Mr Garry's History Revision Hub", a revision website for History students at Arcadia British School Dubai. Follow the attached PRODUCT_SPEC.md exactly. It is the source of truth for features, rules and design.

In this first step:
- Set up the design system from section 8: fonts Bricolage Grotesque (headings), Atkinson Hyperlegible (body) and IBM Plex Mono (chips) from Google Fonts, the light and dark colour tokens, a 10px radius, and a dark-mode toggle that respects the system setting.
- Build the header: navy "M" logo tile, "Mr Garry's · Arcadia British School Dubai" above "History Revision Hub", and on the right a "Progress saved" status, a Search button, the dark-mode toggle and an account button.
- Load all course content from src/content/all-content.json ({ courses, topics }). Never hard-code course content.
- Build the Home page: a hero with my photo (public/mr-garry.png, circular, alt "Mr Garry, History teacher at Arcadia British School Dubai"), the eyebrow "History · Key Stage 3 to International A Level", the heading "Choose your year" and the subtitle "Learn the content, test your memory, practise your writing and act on feedback." Below, a grid of year cards for every course in the data. Each card shows the big year number in the course accent colour, the title, the enquiry line, and a chip saying "N topics ready" (published topics) or "Coming soon".
- It must work on a 375px phone with no horizontal scrolling.
```

## Prompt 2: course pages and exam guide

```
Add the Course page (route /course/:courseId), following PRODUCT_SPEC.md section 2.2:
- A heading with the course accent bar. Three action cards: Exam guide, Mixed quiz, Key dates quiz.
- Topic cards grouped by area (course.areas), sorted by topic.order, each showing kt, title and a progress bar.
- An "About the exam" panel built from course.exam: board, qualification, codes, specification version, each paper's structure, assessment objectives (collapsible), source_focus (collapsible) and sources (collapsible, with links).
- resources_received and resources_needed lists.

Add the Exam guide page (/course/:courseId/guide). For every paper in course.exam.papers and every question-type key in paper.qtypes, render course.qtypes[key] as a card:
- chips: paper, marks, minutes, AO
- "How the question is worded" (template)
- collapsible sections: What it asks you to do (asks), Step-by-step approach (steps), Planning and timing (plan), Assessment criteria and mark scheme levels (success + a table of markscheme.levels + criteria_list + evidence_tip), Common mistakes (mistakes), What examiners said (examiner[]: series, Strong answers, Common weaknesses, a "Read the full report" link, and a note "Paraphrased from Pearson's published examiner reports"), Writing frame(s) (frame.full or frames[].full as numbered sentence starters), and Annotated model (model[] where each item shows t as the text and n as an italic annotation, then model_note)
- a list of every practice question in the course whose qtype is this key, linking to it
- if requires_sources is true, a small note that the question needs the paper's sources.
```

## Prompt 3: topic page, Learn and Overview

```
Add the Topic page (/topic/:topicId) with tabs: Overview, Learn, Quizzes, Flashcards, Checklist, Exam practice, Writing frames, Stretch. Use breadcrumbs (Home › Year › Topic › Tab).
- If topic.review.state is "awaiting-teacher-check", show an amber notice: "Written for this site and awaiting Mr Garry's check against class lessons."
- Learn: render learn.intro, then each section (title, blocks — {p} as a paragraph, {ul} as a list — key terms as chips, a "Precise evidence" box, and refs). Then the timeline (vertical list of date and event), key people, vocabulary and misconceptions (✗ wrong → ✓ right).
- Overview: the intro, a progress summary and links to each tab.
- Stretch: list stretch[] as cards showing the kind as a label and the task.
```

## Prompt 4: quizzes and flashcards

```
Build the Quizzes and Flashcards tabs from topic.quizzes and topic.flashcards (PRODUCT_SPEC.md section 2.4):
- Multiple choice: options[] with answer as an index. After answering, show right or wrong and the "why". Short answer: accept any string in accept[] (case-insensitive, punctuation and extra spaces ignored), then show the answer. Chronology: the student orders the items by tapping or dragging, and items[] holds the correct order. Matching: pair left with right. Evidence: free text, marked as correct if it contains at least one keyword from each group in keywords[][], then show the model.
- Show a score at the end and save the best score per quiz.
- Flashcards: flip cards (q on the front, a and hint on the back), with a pin button and Leitner spaced review. Buttons Again / Hard / Good / Easy move the card between boxes 1–5, with intervals of 0, 1, 3, 7 and 14 days. Show a "due today" count, and treat box 5 as mastered.
- On the Course page, add Mixed quiz (random MCQs from every topic in the course) and Key dates quiz (match timeline dates to events from every topic in the course).
- For now, save progress in the browser. Prompt 6 moves it to the database.
```

## Prompt 5: checklist, exam practice and writing frames

```
Build:
- Checklist tab: each topic.checklist item has a Bloom level colour (describe = red, explain = amber, judge = green), the "I can…" text, buttons Red / Amber / Green (with text, not colour alone) for the student's own rating, and links to the related Learn sections. Show RAG counts at the top.
- Exam practice tab: list topic.exam.questions. A question with a qtype inherits every field of course.qtypes[qtype], and the question's own fields override them. Show chips for the question type label, marks, minutes and label (e.g. "Past paper: 4HI1/02, June 2025, A4(a)").
- Question page (/topic/:topicId/exam/:questionId): the question text (keep line breaks); sources with label, provenance and text if present; if the question needs sources and has none, an amber notice: "This question needs sources or extracts that are not on the site yet. You can still practise the structure; AI feedback will not judge how you used the sources."; the same guide sections as the Exam guide; a writing-frame chooser (Full sentence starters / Headings only / No frame); a text area with a live word count and autosave; buttons Save draft, Get AI feedback (disabled until prompt 8) and Redraft; and a list of previous attempts.
- Writing frames tab: every frame for the question types used in this topic.
- Department rules: paragraphs are PEEJ (Point, Evidence, Explain, Judge), never SPEND. Essay frames use the criteria duration, scope, effectiveness and impact.
```

## Prompt 6: database and sign-in

```
Enable Lovable Cloud (Supabase) and add real sign-in and saving, following PRODUCT_SPEC.md sections 1, 6 and 7:
- Roles: teacher and student. Students sign in with a username and a code (no email). Map them to auth users internally, for example username@students.invalid, and never collect real emails. The teacher signs in with a username and password.
- Tables: profiles (id, username, role, display, class), progress (user_id, json), submissions (id, user_id, topic_id, question_id, parent_id, text, status, ai_json, ai_error, teacher_json, timestamps), usage (id, user_id, at, input_tokens, output_tokens, cost_usd), settings (key, value), content (id, kind, json, status, updated_at).
- Row Level Security on every table: a student can read and write only their own progress and submissions; only the teacher can read all of them; students can never read usage, settings or other students' profiles; and students can write content only as the teacher.
- Move flashcard, quiz and checklist progress and drafts into the progress table, and show "Progress saved" in the header after each save.
- Seed the content table from src/content/all-content.json the first time the site runs. After that, the site reads content from the database so the teacher can edit it.
```

## Prompt 7: Teacher area

```
Add the Teacher area (teacher only), following PRODUCT_SPEC.md section 2.6:
- Students: paste lines of "username, class" to create accounts. Generate a random 8-character code for each, show it once and store only a hash. Buttons to reset a code (which signs the student out), export a student's data as JSON, and delete a student (which also removes their progress and submissions) after a confirmation.
- Progress: a table by class, student and topic of flashcards mastered, best quiz scores and checklist RAG counts.
- Submissions: filter by class, topic and status. Open a submission to see the answer and the AI feedback, and save a review (mark, max, comment). The student then sees "Mr Garry's review" above the AI feedback.
- Mark schemes: for each course and question type, show the markscheme levels with an "I have checked this" tick that sets markscheme.verified = true in the content table.
- Content: list topics and courses, edit their JSON with validation, switch status between draft and published (students never see drafts), and import a topic or course JSON file as a draft.
- Backup: download everything as one JSON file, and restore from a file after typing RESTORE to confirm.
- Students' "My data" page: download my data, and delete my submissions.
```

## Prompt 8: AI feedback in a server-side function

```
Add AI feedback as a Supabase Edge Function called "mark-answer", following PRODUCT_SPEC.md section 5 exactly.
- Store the AI provider's API key ONLY as an Edge Function secret. Never put it in front-end code, and never ask students for a key.
- Before calling the AI: check that AI is enabled in settings, the key exists, prices are set, and the monthly ceiling (default USD 10) minus spend so far covers the worst-case cost of this call (max input tokens plus max_output_tokens at the entered prices). Also check the student's daily limit (3), the 60-second cooldown, the 900-word limit and the redraft limit (2).
- Use indicative mode (with a mark) only if the resolved question's markscheme.verified is true AND (the question does not need sources OR its sources are present). Otherwise use formative mode (no mark).
- Build the prompt from: the question, the sources or "sources not available", the verified mark scheme, the department approach (PEEJ, factor frame with duration, scope, effectiveness and impact), the examiner[] advice, the topic's Learn text, and the previous attempt if this is a redraft. Ask for the JSON in the spec.
- Validate the reply: keep only judgement_evidence quotes that appear word for word in the answer, clamp the mark to 0..max, limit strengths to 4 and improvements to 3, and remove marks in formative mode. Save the result to submissions.ai_json and log usage and cost.
- If the provider fails, keep the draft, save ai_error and show the reason. Never show invented or simulated feedback.
- Student view: an "Indicative mark — your teacher may change it" banner, or "Formative feedback — no mark". Then show strengths, corrections, the top 3 improvements, an example improvement (before and after), a redraft task, and the AO comments. For a redraft, add "What changed since your last draft".
- Teacher view: an "AI and limits" tab with on/off, model, prices, monthly ceiling, limits and this month's spend.
```

## Prompt 9: search, polish and accessibility

```
- Search: press "/" or click Search to open a dialog that searches topic titles, Learn text, vocabulary, people and timeline across published topics. Results link to the right tab.
- Check every page at 375px width: no horizontal scroll, wrapping tabs, and tables that scroll inside their own box.
- Accessibility: a visible focus ring (#f0a400), aria-current on the active tab, real buttons for every action, and alt text on the photo.
- Add an "About Mr Garry" card on the Home page under the year grid, using public/mr-garry.png and the text: "Mr Garry teaches History at Arcadia British School Dubai. Use this site to learn the content, test yourself and practise exam answers — then act on the feedback."
```

## Prompt 10: check the build

```
Test the site end to end with made-up accounts:
1. As the teacher, create students "10a.test1" and "10a.test2" in class 10A.
2. As test1, rate a checklist item, review some flashcards, take a quiz, write an answer to a past-paper question, and request AI feedback. With no verified mark scheme, it must be formative only.
3. As test2, confirm you cannot see test1's submissions, even by calling the API directly.
4. As the teacher, open test1's submission, override it with a mark and comment, and confirm test1 sees "Mr Garry's review".
5. Tick a mark scheme as checked, then confirm a new answer gets an indicative mark within the allowed range.
6. Download a backup, delete test2, and check that their data is gone.
Fix anything that fails.
```

## After building

- Publish, then add real students from the Teacher area. Give each student their code privately.
- Check each topic's content against your lessons, then tick the mark schemes you are happy with.
- If something breaks, compare it with `reference-code/`, which is the working version.
