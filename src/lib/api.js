// The only module the UI imports. Wraps the engine (ollama, pool, personas, prompts)
// behind the contract agreed in ANGEL.md / PARTNER.md.

import { chat, chatStream, MODEL } from './ollama.js'
import { runPool } from './pool.js'
import { generateCrowd } from './personas.js'
import { PANEL } from './panel.js'
import { SAMPLES } from './samples.js'
import { briefSchema, crowdSchema, panelSchema, reportSchema } from './schemas.js'
import {
  BRIEF_SYSTEM, briefUser, briefText,
  CROWD_SYSTEM, crowdUser, PANEL_SYSTEM, LOOPHOLE_SYSTEM_EXTRA, panelUser,
  REPORT_SYSTEM, reportUser, summarizeCrowd, cleanQuote
} from './prompts.js'

// 200 seeded residents (same every run). Smaller runs use the first N.
// Each persona: { id, name, age, job, income, commute, household, purok, outlook, voice, values, details[] }
export const PERSONAS_200 = generateCrowd(200)

// Extra (additive): panel character info for the cards: { id, name, role, emoji, bio }.
export const PANEL_PERSONAS = PANEL

// Extra (additive): 10 Quezon City sample ordinances: { id, title, source, text }.
export { SAMPLES }

// ---------- Brief ----------
// Reads the ordinance once into plain facts that every resident and panelist reasons from.
// Cached per ordinance text (the promise is cached, so crowd and panel share one call).
const briefCache = new Map()
export function getBrief(ordinanceText) {
  if (!briefCache.has(ordinanceText)) {
    const p = chat({ system: BRIEF_SYSTEM, user: briefUser(ordinanceText), schema: briefSchema, numPredict: 350, temperature: 0.2 })
      .catch(() => chat({ system: BRIEF_SYSTEM, user: briefUser(ordinanceText), schema: briefSchema, numPredict: 350, temperature: 0.2 }))
    briefCache.set(ordinanceText, p)
    p.catch(() => briefCache.delete(ordinanceText))   // don't cache failures
  }
  return briefCache.get(ordinanceText)
}

// Brief as text; falls back to the raw ordinance if the brief can't be made (except Ollama down).
async function briefOrText(ordinanceText) {
  try {
    return briefText(await getBrief(ordinanceText))
  } catch (err) {
    if (err.message?.startsWith('Ollama')) throw err
    return ordinanceText
  }
}

// ---------- Crowd ----------
// onResult(index, persona, reaction) as each resident finishes.
// reaction: { touches_me, effect, impact, stance, comply, quote } or { error: true } after 2 failed tries.
// Resolves to the array of reactions in persona order.
export async function runCrowd(ordinanceText, size, onResult, signal) {
  const personas = PERSONAS_200.slice(0, size)
  const brief = await briefOrText(ordinanceText)
  const tasks = personas.map(p => async s => {
    const r = await chat({ system: CROWD_SYSTEM, user: crowdUser(p, brief), schema: crowdSchema, signal: s })
    return { ...r, quote: cleanQuote(r.quote) }
  })
  const results = await runPool(tasks, {
    concurrency: 2,
    signal,
    onResult: (i, r) => onResult?.(i, personas[i], r ?? { error: true })
  })
  return results.map(r => r ?? { error: true })
}

// ---------- Panel ----------
// Turns partial JSON into readable text while streaming (no braces/keys on screen).
const LABELS = { life_impact: 'Life impact', reaction: 'Reaction', loophole: 'Loophole', what_would_help: 'What would help' }
function preview(partial) {
  const parts = []
  for (const m of partial.matchAll(/"(life_impact|reaction|loophole|what_would_help)"\s*:\s*"((?:[^"\\]|\\.)*)/g)) {
    parts.push(`${LABELS[m[1]]}: ${m[2].replace(/\\n/g, ' ').replace(/\\"/g, '"')}`)
  }
  return parts.join('\n\n')
}

// onToken(personaId, textSoFar) while streaming; onDone(personaId, result).
// result: { life_impact, impact, stance, comply, reaction, loophole, what_would_help } or { error: true }.
// Resolves to { [personaId]: result }.
export async function runPanel(ordinanceText, onToken, onDone, signal) {
  const out = {}
  const brief = await briefOrText(ordinanceText)
  const tasks = PANEL.map(p => async s => {
    const system = PANEL_SYSTEM + (p.id === 'atty' ? LOOPHOLE_SYSTEM_EXTRA : '')
    return chatStream({
      system, user: panelUser(p, ordinanceText, brief === ordinanceText ? '' : brief), schema: panelSchema,
      numPredict: 520, temperature: 0.7, signal: s,
      onToken: text => onToken?.(p.id, preview(text))
    })
  })
  await runPool(tasks, {
    concurrency: 2,
    signal,
    onResult: (i, r) => {
      out[PANEL[i].id] = r ? { ...r, reaction: cleanQuote(r.reaction) } : { error: true }
      onDone?.(PANEL[i].id, out[PANEL[i].id])
    }
  })
  return out
}

// ---------- Report ----------
// crowdResults: array of reactions in persona order (what runCrowd returns), or
//               array of { persona, reaction } / sparse arrays; all are accepted.
// panelResults: { [personaId]: result } (what runPanel returns) or an array of results.
// Returns { headline, most_affected[], top_loopholes[], amendments[{ clause, change, reason }] }.
export async function runReport(ordinanceText, crowdResults, panelResults) {
  const reactions = Array.from(crowdResults, x => {
    const r = x?.reaction ?? x
    return r && !r.error && r.stance ? r : null
  })
  const summary = summarizeCrowd(PERSONAS_200.slice(0, reactions.length), reactions)

  const panelArr = Array.isArray(panelResults) ? panelResults : PANEL.map(p => panelResults?.[p.id])
  const panelAnswers = PANEL.map((p, i) => {
    const a = panelArr[i]
    return { name: p.name, role: p.role, answer: a && !a.error && a.loophole ? a : null }
  })

  const user = reportUser(ordinanceText, summary, panelAnswers)
  const call = temperature => chat({ system: REPORT_SYSTEM, user, schema: reportSchema, numPredict: 650, temperature })
  try {
    return await call(0.4)
  } catch (err) {
    if (err.message?.startsWith('Ollama not running')) throw err
    return await call(0.6)       // one retry on bad JSON or a repetition loop, with a little more variety
  }
}

// ---------- Health ----------
// true if Ollama is reachable and the engine model is installed.
export async function checkOllama() {
  try {
    const res = await fetch('/ollama/api/tags')
    if (!res.ok) return false
    const { models = [] } = await res.json()
    return models.some(m => m.name === MODEL || m.model === MODEL)
  } catch {
    return false
  }
}

export { MODEL }
