# Student data and privacy

## What is stored

| Data | Where | Who can see it |
|---|---|---|
| Username (pseudonymous), optional class | Database | The student and the teacher |
| Sign-in code | Stored only as a salted hash | Nobody can read it back; the teacher can issue a new one |
| Progress: quiz results, flashcard schedule, checklist ratings, planning notes | Database | The student and the teacher (via progress export) |
| Written answers and feedback | Database | Saved drafts: the student only. Once the student sends an answer or asks for feedback: the student and the teacher. Other students: never. Full backups include drafts. |
| AI usage (date, token counts, cost) | Database | Teacher. Deleting a student removes their link to these rows. |

No email addresses, real names or dates of birth are required. Use usernames such as `7a.amira.k`.

## How access is enforced

All checks happen on the server, not in the browser: each request is tied to a signed-in session (an HttpOnly cookie), students can only read or change their own records, and every teacher route rejects student sessions. The automated tests check these rules.

## AI processing

When a student presses **Save and get feedback**, the server sends Anthropic's Claude API (model set in Teacher area, default `claude-sonnet-5-5`):
- the question, success criteria and any verified mark scheme,
- the relevant sections of course content for that question only,
- the student's answer text (and their previous draft, for a redraft).

The username, class and account details are **not** sent. Requests are made with the school's key, held on the server; students never enter keys. Check Anthropic's current commercial terms for how API data is retained before switching AI feedback on, and record the decision in the school's data-protection log.

## Export and deletion

- Students: My account › Download my data.
- Teacher: Students › Export (one student), Backup and export (everything).
- Deletion: Students › Delete removes the account, progress and submissions immediately. Backups you have already downloaded still contain the data until you delete them.
