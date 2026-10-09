# HomeworkLens

**Class group chaos, turned into a clean checklist — in seconds.**

Every student lives in one chaotic class group. Homework is buried under 200 messages, memes and "good morning" forwards. HomeworkLens reads your class-group screenshots with AI and turns them into a clean, deadline-sorted checklist.

Built for **EvoHacks 2026** — theme: *AI for Automation*.

---

## Features

- **Screenshot scan** — drop, browse or paste (Ctrl+V) up to 6 class-group screenshots; Gemini Vision reads them directly
- **Text mode** — paste copied chat text instead of screenshots
- **Smart extraction** — separates homework, exams, things to bring and announcements
- **Noise filtering** — skips greetings, memes and small talk, and reports how many messages were filtered out
- **Deadline intelligence** — converts relative words like "kal", "Friday", "parso" into real dates with urgency badges (Today / Tomorrow / In X days)
- **Focus strip** — everything due today or tomorrow, plus a countdown to the next exam, shown first
- **Urgency sorting** — homework auto-sorted by priority and nearest deadline
- **English output** — AI responses in English
- **AI answer grading** — paste any exam question plus your answer; AI awards marks strictly, like an examiner, with strengths, gaps and an improvement tip
- **Live API key check** — one click in Settings verifies your Gemini key against Google's API
- **Live model list** — fetches the real list of Gemini models available on your key and lets you pick which vision model to use
- **Tick-off checklist** — check items off as you finish; state persists across reloads
- **One-tap summary** — copy the clean list, share it to WhatsApp, or print it
- **Scan history** — your last 15 scans, stored locally in the browser
- **Live demo mode** — try the full experience with zero setup, no API key needed
- **Private by design** — the Gemini API key never leaves the browser (localStorage), and screenshots go directly to Google's Gemini API. No backend, no signup, no data stored on any server

## Quick start

1. Open `index.html` in a browser (or serve the folder with any static server)
2. Click **Try live demo** to see it work instantly — no key needed
3. For real scans: get a free API key at [aistudio.google.com](https://aistudio.google.com/), open **Settings**, paste the key, save
4. Upload a class-group screenshot and click **Scan with AI**

## Tech

- Vanilla HTML, CSS and JavaScript — zero build step, zero dependencies
- Google **Gemini** multimodal API (vision input + structured JSON output)
- localStorage for settings, checklist state and history

## Why this matters

Students lose real time every single day scrolling class groups to find what they actually need to do — and miss deadlines because homework was buried under chatter. HomeworkLens automates the most repeated daily loop in a student's life: *find homework, note the deadline, remember the materials.*

## Builder note

Built by a 15-year-old AI-native builder for EvoHacks 2026. The product was designed, directed and verified by me; the code was generated with AI tooling under my direction and tested end-to-end.

## License

MIT — see [LICENSE](LICENSE).
