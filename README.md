# Mr Garry's History Revision Hub

Revision website for History at Arcadia British School Dubai: Learn pages, knowledge quizzes, flashcards with spaced review, personal learning checklists, exam practice with writing frames, stretch tasks, and optional AI feedback on written answers with teacher review.

- **No dependencies.** Runs on Node.js 22.5 or newer using built-in SQLite. Nothing to `npm install`.
- **One folder = the whole site.** Code, content (JSON) and the database file (`data/hub.sqlite`).

## Quick start (your own computer)

```bash
TEACHER_PASSWORD='choose-a-long-password' npm start
# open http://localhost:3000 and sign in as  mrgarry
```

Add students in **Teacher area › Students**. AI feedback stays off until you add an API key and token prices (see `docs/DEPLOYMENT.md`).

## What's where

| Path | Purpose |
|---|---|
| `server/` | Web server, sign-in, permissions, AI marking, limits, backups |
| `public/` | The website students and you use |
| `content/courses.json` | The six courses and their exam details (unverified fields are `null`) |
| `content/topics/*.json` | One file per topic (Year 7 Hastings is complete) |
| `docs/CURRICULUM_MAP.md` | Curriculum map and the list of missing documents |
| `docs/DEPLOYMENT.md` | Putting it online |
| `docs/MAINTENANCE.md` | Adding topics, mark schemes, backups and restores |
| `docs/DATA_AND_PRIVACY.md` | What is stored, who can see it, which AI provider |
| `test/` | Automated tests (`npm test`) |
| `scripts/build-preview.js` | Builds the one-page preview (`npm run build:preview`) |
