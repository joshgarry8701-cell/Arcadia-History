# Build pack: Mr Garry's History Revision Hub

This pack lets you rebuild the Revision Hub with **Lovable** or **Google AI Studio**, or hand it to a developer. It holds everything the working site holds.

| File or folder | What it is | Who it is for |
|---|---|---|
| `START_HERE.md` | This guide | You |
| `PRODUCT_SPEC.md` | What the site must do: pages, features, rules, data model, AI marking, privacy, design | Paste or attach into any AI builder |
| `LOVABLE_PROMPTS.md` | Ten prompts to paste into Lovable one at a time | Lovable |
| `GOOGLE_AI_STUDIO_PROMPT.md` | One long prompt plus follow-ups for AI Studio's Build mode | Google AI Studio |
| `content/CONTENT_HANDBOOK.md` | Every word of course content in one readable document: specifications, exam structures, mark-scheme levels, examiner-report advice, sentence starters, annotated models, Learn notes, timelines, quizzes, flashcards, checklists, exam questions and stretch tasks | You (to check), students' teachers, any builder |
| `content/all-content.json` | The same content as one data file the website reads | The builder (this is the file the app loads) |
| `content/courses.json`, `content/topics/*.json` | The same data split into one file per course list and per topic | Developers |
| `assets/mr-garry.png`, `assets/mr-garry.webp` | Your photo for the home page and the "About Mr Garry" card | All builders |
| `reference-code/` | The complete working site (Node.js, no dependencies) with tests and documentation | A developer, or as a reference for the AI builder |

## The quickest route

1. **Run the real site.** `reference-code/` already does everything in the spec. `reference-code/docs/DEPLOYMENT.md` shows how to put it online (Render, Railway, a school server). This is the most reliable option.
2. **Lovable.** Follow `LOVABLE_PROMPTS.md`. It builds a React site with a Supabase database and runs AI marking in a server-side function.
3. **Google AI Studio.** Follow `GOOGLE_AI_STUDIO_PROMPT.md`. It builds a React app quickly and is good for a demo. Marking would use Gemini, and you need to deploy it with the key held on a server before students use it (see the warnings in that file).

## Using your photo

Upload `assets/mr-garry.png` in the builder's chat, or add it to the project's `public/` folder. Then say: *"Use this photo of me as a circular portrait in the home-page hero, next to the heading 'Choose your year', and on the About Mr Garry card. Alt text: 'Mr Garry, History teacher at Arcadia British School Dubai'."*

## Things to keep true, whichever builder you use

- **No student data goes into the builder.** Build and test with made-up accounts only. Real students are added after the site is deployed, from the Teacher area.
- **AI keys never go in the browser.** Students never enter a key. The key lives in a server-side secret, such as a Supabase Edge Function secret or a Cloud Run environment variable, and there is a monthly spending ceiling.
- **Marks are indicative only.** The AI gives a mark only when you have ticked a mark scheme as checked. Otherwise feedback is formative, and you can review and override any feedback.
- **Pearson copyright.** Past-paper questions are quoted with their series, and mark-scheme and examiner-report advice is paraphrased. Keep the site behind sign-in for your students and don't publish the handbook publicly. The source and extract booklets for past papers are not included. Upload the ones you hold in the Teacher area.
- **Content is "awaiting teacher check".** Topic notes are original writing. Read each topic before telling students it is final.

## What is in the content (October 2026)

- **Year 7:** Norman Conquest (1 topic). Years 8 and 9 are set up and waiting for department material.
- **Year 10:** International GCSE Paper 1, Germany 1918–45 (5 topics) and A divided union: civil rights in the USA 1945–74 (5 topics).
- **Year 11:** International GCSE Paper 2, A4 Vietnam 1945–75 (5 topics) and B2 Changes in medicine c1848–c1948 (5 topics).
- **Year 12:** IAL Unit 1, Germany 1918–45 (4 topics) and Unit 2, China 1900–76 (4 topics).
- **Year 13:** IAL Unit 3, Civil Rights 1865–2009 (6 topics) and Unit 4, Superpower Relations 1943–90 (4 topics).

Each course has an exam guide for every question type. Each guide gives how the question is worded, step-by-step method, timing, success criteria, mark-scheme levels, common mistakes, examiner-report advice, writing frames with sentence starters and, where available, an annotated model.
