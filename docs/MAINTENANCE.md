# Maintaining the Revision Hub

## Every half term

- **Download a full backup** (Teacher area › Backup and export) and keep it in school storage. It contains student work, so store it securely.
- Check **AI and limits** for the month's spend.

## Mark schemes (turn on indicative marks)

Teacher area › Mark schemes. Years 11–13 have one mark scheme per **question type** (for example "Unit 1 essay" or "Paper 1 (c)"), pre-filled from Pearson's published mark schemes and your training booklet. Check the wording, then tick "I have checked this" — every question of that type then gets indicative marks. Until it is ticked, AI feedback is formative only.

Source questions (Unit 2 and Unit 3 Section A, Unit 4 Section A, IGCSE Paper 2 (b) and (c)) only get a mark when the sources are on the site. A past-paper source question without its sources gets formative feedback only.

Year 7 questions have their own individual mark schemes further down the same page.

## Adding a new topic

1. Copy `content/topics/y7-hastings.json` as a template and keep its structure: `learn`, `quizzes`, `flashcards`, `checklist`, `exam`, `stretch`.
2. Set `id` (e.g. `y9-ww1-causes`), `course` (e.g. `y9`) and `"status": "draft"`.
3. Teacher area › Content › **Import a topic or course file**. It arrives as a draft that students cannot see.
4. Check it on the site, then Content › Edit › Status: Published.

Rules that keep content accurate:
- Exam requirements come only from specifications and official documents. Leave a field `null` rather than guessing.
- Practice questions you write are labelled "Teacher-created". Call a question a past-paper question only when you can name the paper.
- Sources need real provenance (who, when, why). Label any invented practice extract as teacher-created; never present it as a real quotation.
- Write content in your own words; don't paste textbook passages.
- Year 11 Germany / Civil Rights are separate topic files from Year 12 Germany and Year 13 Civil Rights. Never share question banks between them.

## Exam details for Years 11–13

Edit `courses` in Teacher area › Content. Fill `specification_version`, each option's `title`, `code`, `date_range`, then `papers`, `question_types`, `marks` and `assessment_objectives`, and set `"verified": true` only after checking against the specification. Keep `docs/CURRICULUM_MAP.md` in step.

## Students

- Add: Teacher area › Students (one `username, class` per line). Codes are shown once.
- Lost code: **New code** (signs them out everywhere).
- Leaving or data request: **Export** gives their data as a file; **Delete** removes the account, progress and submissions permanently.

## Restoring from a backup

Teacher area › Backup and export › Restore › choose file › confirm. Everything is replaced and everyone signs in again. Tested by the automated test suite.

## Updating content files on a live site

New topic files placed in `content/topics/` are added automatically when the site restarts. Files already on the site are **not** overwritten, so edits you made in the Teacher area are safe. To replace everything with the files (losing those edits), restart once with `CONTENT_RESEED=true`.

Check files before uploading: `node scripts/validate-content.js`.

## Changing the code

```bash
npm test                 # 11 API tests: permissions, saving, limits, budget ceiling, question-type marking, backup/restore
node scripts/validate-content.js   # checks every topic file
npm run build:preview    # rebuilds dist/preview.html
git add -A && git commit -m "Describe the change"
```

## If AI feedback stops

Students see the reason and their writing is kept. Everything else (reading, quizzes, flashcards, checklists, saving answers) keeps working. Usual causes: monthly ceiling reached, daily limit reached, key missing or expired, prices not entered.
