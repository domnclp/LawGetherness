# ANGEL.md: role file for Angel's agent (Claude Code)

You are the coding agent for **Angel**. Angel's partner works in the same repo at the same time with Codex, using `PARTNER.md`. Follow this file and CLAUDE.md. If they conflict, this file wins on file ownership.

## Your role: BACKEND (engine, local AI, data)

**You own (may create and edit):**
- `src/lib/ollama.js`, `src/lib/pool.js`, `src/lib/personas.js`, `src/lib/panel.js`, `src/lib/prompts.js`
- `src/lib/api.js` (the functions the UI calls, see Contract below)
- `vite.config.js`
- `public/runs/*` (saved 200-resident run)

**You must NOT edit:**
- `src/components/*`, `src/App.jsx`, `src/mocks/*`, any `.css` file (partner owns these)
- Shared files (see Shared rules) unless Angel says the partner agreed

**Only Angel's laptop has the GPU (RTX 3060 Laptop, 6 GB).** You do all Ollama testing, prompt tuning, and the final 200-resident run.

## Your tasks, in order
1. 12:45-1:15: write `src/lib/schemas.js` and `src/lib/api.js` with the exact signatures below (bodies can throw "not implemented"). Commit, push, tell Angel to message the partner "contract pushed".
2. 1:15-2:45: implement `ollama.js`, `pool.js`, `personas.js`, `panel.js`, `prompts.js`, then fill in `api.js`.
3. 2:45: push. Partner switches the UI from mocks to `api.js`.
4. 3:15-4:30: prompt tuning (Taglish quality, varied stances).
5. 4:30-5:00: report prompt for `runReport`.
6. 5:00-6:00: full 200 run with Wi-Fi off, save to `public/runs/run-200.json`.

## Git
- Branch: `angel/engine`
- Before each task: `git pull --rebase origin main`
- Stage only your files: `git add src/lib vite.config.js public/runs`. **Never `git add .`**
- Commit small, message starts with `engine:`
- Push after each task: `git push origin angel/engine`

---

## Shared rules (identical in ANGEL.md and PARTNER.md)

### Shared files: change only after both humans agree in chat
`src/lib/schemas.js`, `package.json`, `package-lock.json`, `README.md`, `CLAUDE.md`, `AGENTS.md`, `ANGEL.md`, `PARTNER.md`, `index.html`

### The contract (frozen after 1:15 AM)
The UI talks to the engine only through `src/lib/api.js`:

```js
// crowd: calls onResult(index, persona, reaction) as each resident finishes
export async function runCrowd(ordinanceText, size, onResult, signal) {}   // size: 50 | 100 | 200
// panel: calls onToken(personaId, textSoFar) while streaming, onDone(personaId, result)
export async function runPanel(ordinanceText, onToken, onDone, signal) {}
// report: returns the report object
export async function runReport(ordinanceText, crowdResults, panelResults) {}
// health: true if Ollama is reachable and qwen2.5:3b is loaded
export async function checkOllama() {}
export const PERSONAS_200 // array of 200 seeded persona objects
```

Shapes (defined in `schemas.js`):
- persona: `{ id, name, age, job, income, commute, household, purok }`
- crowd reaction: `{ stance: "support"|"mixed"|"oppose", impact: 1-5, comply: "comply"|"partial"|"evade", quote }`; failed resident: `{ error: true }`
- panel result: `{ reaction, life_impact, loophole }`
- report: `{ most_affected: [], top_loopholes: [], amendments: [{ clause, change, reason }] }`

If a shape must change: stop, tell your human, both humans agree, ONE person edits `schemas.js`, push, the other pulls immediately.

### Sync schedule
- Every hour on the half hour (1:30, 2:30, 3:30, 4:30, 5:30): both push, Angel merges both branches into `main` on Angel's laptop, runs the app, pushes `main`, both pull `main`.
- Final merge to `main`: 9:00 AM. Code freeze: 10:00 AM. Repo must be public.

### Never do
- `git reset --hard`, `git checkout .`, `git clean -fd`, `git push --force`, `git rebase -i` on pushed commits
- Delete or rewrite the other person's files to fix your error
- Install npm packages without your human asking the other human first (then one person installs and commits `package.json` + lockfile right away)
- Add any cloud AI API call

### On a merge conflict
Stop. Report the file and both sides to your human. Do not resolve it by deleting the other side. For `package-lock.json`: take either side, then run `npm install`.

### Human chat protocol (one line each)
- "contract pushed" / "pushed engine, pull main" / "touching <shared file> now" / "need new package: <name>" / "blocked on <thing>"
