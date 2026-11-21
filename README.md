# BridgeLearn — AI study buddy that works anywhere, even offline

Built for **Bridge The Gap Hacks 2026** ([sq-hacks.devpost.com](https://sq-hacks.devpost.com/))
— themes: Education & Accessibility, AI & emerging technologies, Community impact, Social Good.

> Talent exists everywhere, but fast internet and paid tutors don't. BridgeLearn
> turns any lesson text into a quiz, flashcards and a spaced-repetition review
> plan — generated entirely on the student's device, with no account, no server
> and no API key.

## What it does

1. **Paste a lesson** (textbook text, class notes, an article) or load one of the
   three built-in samples (Photosynthesis, How the Internet Works, Civic Rights 101).
2. **Instant quiz** — mixed multiple-choice, fill-in-the-blank and true/false
   questions built from the student's own text, with immediate feedback.
3. **Flashcards** — term → definition cards extracted from the lesson; flip, mark
   "I know this" / "Not yet".
4. **Review plan** — spaced repetition (SM-2): correct answers push the next
   review further out, mistakes bring it back tomorrow. Saved in `localStorage`
   on the device only.
5. **Reading level** — Flesch Reading Ease + grade level for the lesson, so a
   teacher can see whether a text fits their students.

Everything is **deterministic**: the same text always produces the same quiz,
so a teacher can reproduce or print it for a whole class.

## Why offline-first

A single static page with **zero dependencies and zero network calls**. It works
from `file://`, any static host, or GitHub Pages — on a shared phone, a school
computer, or a library's one slow connection. No personal data is collected;
nothing ever leaves the device.

## Run it

Just open `index.html` in any browser. Or serve it:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Tech

Vanilla HTML + CSS + JavaScript. No frameworks, no build step, no backend.
Quiz/flashcard/readability engine in `quiz.js` (pure functions, no DOM);
UI wiring in `app.js`.

## Tests

```bash
node tests/test-quiz.js   # engine: generation, determinism, readability, SM-2, edge cases
```

UI flow (generate → full quiz → flashcards → review plan) is covered by a
headless test in `/tmp/btg-test/ui-test.js` (jsdom) and real screenshots were
taken with Playwright headless Chromium — see `screenshots/`.

## AI disclosure

Built with AI coding assistance (Muse). The idea, design decisions and testing
are the author's own. All quiz generation runs on-device with **no external AI
service** — the "AI" here is a deterministic on-device engine, which is exactly
what makes the app work offline.

## License

MIT.
