// The only module the UI imports. Wraps the engine (ollama, pool, personas, prompts)
// behind the contract agreed in ANGEL.md / PARTNER.md.

import { chat, chatStream, MODEL } from './ollama.js'
import { runPool } from './pool.js'
import { generateCrowd, CROWD_MIX, JOBS } from './personas.js'
import { PANEL } from './panel.js'
import { SAMPLES } from './samples.js'
import { findRun, saveRun, exportRun } from './runcache.js'
import { printCouncilMemo as printMemo, downloadCouncilMemo as downloadMemo, buildMemoHtml } from './memo.js'
import { briefSchema, crowdSchema, crowdSchemaNoInsight, panelSchema, reportSchema, summarySchema } from './schemas.js'
import {
  BRIEF_SYSTEM, briefUser, briefText, checkBrief,
  CROWD_SYSTEM, crowdUser, PANEL_SYSTEM, LOOPHOLE_SYSTEM_EXTRA, panelUser,
  REPORT_SYSTEM, REPORT_UNLAWFUL_SYSTEM, reportUser, summarizeCrowd, cleanQuote, legalCheckText, reconcile,
  findContradiction, neighborsDigest, fairnessLens, missingSections, affectedGroupsFor,
  relevantDetails, pickIssue, tidyEnd, clusterInsights, bystanderEffect, words, jaccard,
  SUMMARY_SYSTEM, summaryUser, quickSummary, composeWhy
} from './prompts.js'

// 200 seeded adult residents (same every run), national approximate mix. Smaller runs use
// the first N, which are ordered to keep roughly the same mix.
// Each persona: { id, name, age, group, job, employment, income, commute, household, purok,
//                 outlook, voice, values, angle, details[], lives_with, schedule }
export const PERSONAS_200 = generateCrowd(200)

// Extra (additive): the mix behind PERSONAS_200, for the UI label ("National mix, approximate").
// { label, source, groups: [{ group, count }], employment: { 'wage/salary': 79, ... } }
// JOBS: occupation groups in display order (filter by persona.group).
export { CROWD_MIX, JOBS }

// Extra (additive): panel character info for the cards: { id, name, role, emoji, bio }.
export const PANEL_PERSONAS = PANEL

// Extra (additive): Quezon City sample ordinances: { id, title, source, text }.
export { SAMPLES }

// ---------- Run cache ----------
// Bump on any prompt, schema, or persona change: cached and saved answers from an older engine are ignored.
export const ENGINE_VERSION = '2026-10-10.3'
const cacheKey = () => ({ version: ENGINE_VERSION, model: MODEL })
const savedIdFor = text => SAMPLES.find(s => s.text === text)?.id
const stripSource = r => { if (!r || typeof r !== 'object') return r; const { source, ...rest } = r; return rest }
// Finds a remembered or saved run for this text and seeds the brief from it (no brief call needed).
async function cachedRun(text) {
  const e = await findRun(text, { ...cacheKey(), savedId: savedIdFor(text) })
  if (e?.brief && !briefCache.has(text)) briefCache.set(text, Promise.resolve(e.brief))
  return e
}
const pause = ms => new Promise(r => setTimeout(r, ms))

// 'saved' (pre-computed preset), 'memory' (finished earlier on this laptop), or null (will run live),
// for the whole run at this size (crowd, summary, panel and report all cached).
export async function getRunSource(ordinanceText, size) {
  const e = await cachedRun(ordinanceText)
  if (!e) return null
  const allCrowd = PERSONAS_200.slice(0, size).every(p => e.crowd?.[p.id])
  // Labeled as saved/remembered only when the summary, panel and report at this size are cached too;
  // otherwise the crowd still replays instantly but the rest runs live.
  const slot = e.bySize?.[size]
  return allCrowd && slot?.summary && slot?.panel && slot?.report ? e.origin : null
}

// Starts the brief call early (e.g. while the user is still looking at the draft) so Run starts faster.
export function prefetchBrief(ordinanceText) {
  if (!ordinanceText?.trim()) return
  cachedRun(ordinanceText).then(() => getBrief(ordinanceText)).catch(() => {})
}

// Plain JSON of a finished run (for public/runs/<id>.json; used by the pre-compute script).
export function exportSavedRun(ordinanceText) {
  return exportRun(ordinanceText, cacheKey())
}

// ---------- Brief ----------
// Reads the ordinance once into plain facts that every resident and panelist reasons from.
// Cached per ordinance text (the promise is cached, so crowd and panel share one call).
const briefCache = new Map()
export function getBrief(ordinanceText) {
  if (!briefCache.has(ordinanceText)) {
    const call = () => chat({ system: BRIEF_SYSTEM, user: briefUser(ordinanceText), schema: briefSchema, numPredict: 1050, temperature: 0 })   // deterministic: one brief field ("Real benefit: None") swung a 30-resident curfew run from 23 to 9 support
    const p = call().catch(call).then(b => checkBrief(b, ordinanceText))
    p.then(brief => saveRun(ordinanceText, cacheKey(), { brief })).catch(() => {})
    briefCache.set(ordinanceText, p)
    p.catch(() => briefCache.delete(ordinanceText))   // don't cache failures
  }
  return briefCache.get(ordinanceText)
}

// Brief as text plus its open questions; falls back to the raw ordinance if the brief can't be
// made (except when Ollama is down).
async function briefOrText(ordinanceText) {
  try {
    const b = await getBrief(ordinanceText)
    return { text: briefText(b), issues: b.issues || [], scenes: b.scenes || [] }
  } catch (err) {
    if (err.message?.startsWith('Ollama')) throw err
    return { text: ordinanceText, issues: [], scenes: [] }
  }
}

// ---------- Crowd ----------
// onResult(index, persona, reaction) as each resident finishes.
// reaction: { touches_me, effect, impact, judgment, stance, comply, insight, quote, adjusted?, reasked? }
// or { error: true } after 2 failed tries. insight is '' for residents the ordinance doesn't touch.
// adjusted: true when reconcile() corrected a label; reasked: true when an inconsistent first answer
// was asked again.
// Resolves to the array of reactions in persona order.
const lastCrowd = new Map()   // ordinance text -> { personas, results }, so runPanel can show neighbors' views
// Remembered or saved residents come back instantly (marked source: 'saved' | 'memory', revealed a
// few ms apart so the map still fills in); only the missing residents run live.
export async function runCrowd(ordinanceText, size, onResult, signal) {
  const personas = PERSONAS_200.slice(0, size)
  const entry = await cachedRun(ordinanceText)
  const known = personas.map(p => entry?.crowd?.[p.id] || null)
  const gap = Math.min(8, 1500 / Math.max(1, known.filter(Boolean).length))
  for (let i = 0; i < personas.length; i++) {
    if (!known[i]) continue
    if (signal?.aborted) break
    known[i] = { ...known[i], source: entry.origin }
    onResult?.(i, personas[i], known[i])
    await pause(gap)
  }
  if (known.every(Boolean) || signal?.aborted) {
    if (!signal?.aborted) lastCrowd.set(ordinanceText, { personas, results: known })
    return known
  }
  const { text: brief, issues, scenes } = await briefOrText(ordinanceText)
  const affected = affectedGroupsFor(ordinanceText)   // occupation groups whose work this ordinance touches
  const lawful = /ordinary, lawful regulation/.test(brief)
  // Who is affected comes from the ordinance text only (model-written brief words leaked in).
  // Affected residents write their own effect and an insight, each on a different open question
  // where possible; the rest get a code-written effect line and no insight.
  let k = 0
  const plan = personas.map(p => {
    const rel = relevantDetails(p.details, ordinanceText, p.job, p)
    const touched = rel.yes.length > 0 || rel.protects.length > 0 || affected.includes(p.group)
    // A resident with a specific stake (a hook) argues from it; brief issues only for the rest
    // (judges saw the night-shift nurse copy a brief issue instead of her real problem).
    // Each resident reasons about one concrete scene: the closest to their life, else rotated.
    return { rel, touched, issue: touched && !rel.hooks.length ? pickIssue(p, issues, rel, k++) : '', scene: pickIssue(p, scenes, rel, p.id) }
  })
  // Crowd-level checks on top of findContradiction: a quote that repeats a neighbor's ("Maganda 'yan
  // para sa mga bata" four times), and "for the children" under a rule that has nothing to do with kids.
  const seen = known.filter(r => r?.quote).map(r => ({ q: r.quote, w: words(r.quote) }))
  const dupOf = r => { const w = words(r?.quote || ''); return w.size >= 3 ? seen.find(x => jaccard(w, x.w) >= 0.5)?.q : undefined }
  const kidsTopic = /minor|curfew|child|youth|school/i.test(ordinanceText)
  const check = (r, p) => findContradiction(r, p, brief, affected, ordinanceText)
    || (!kidsTopic && /para sa (mga )?bata|\bthe kids\b/i.test(r?.quote || '') ? 'this ordinance is not about children; speak about what it changes on your street' : '')
    || (dupOf(r) ? `your quote repeats a neighbor ("${dupOf(r)}"); make a different point from your own angle: ${p.angle}` : '')
  const accept = r => { if (r?.quote) seen.push({ q: r.quote, w: words(r.quote) }); return r }
  // Seed per resident and attempt: the same draft gives the same crowd (fair before/after runs),
  // while a retry after bad JSON or a re-ask still gets a fresh sample.
  const ask = (p, i, s, note = '') => chat({
    system: CROWD_SYSTEM, user: crowdUser(p, brief, affected, ordinanceText, plan[i].issue, plan[i].scene) + note,
    schema: plan[i].touched ? crowdSchema : crowdSchemaNoInsight, numPredict: plan[i].touched ? 330 : 260,
    seed: 1000 * (plan[i].tries = (plan[i].tries || 0) + 1) + p.id, signal: s
  }).then(r => ({
    ...r,
    effect: plan[i].touched ? tidyEnd(r.effect, 130) : bystanderEffect(plan[i].rel, lawful),
    impact: plan[i].touched ? r.impact : Math.min(r.impact, 2),
    why: composeWhy(r.helps, r.hurts),
    insight: plan[i].touched && r.touches_me !== 'not really' ? tidyEnd((r.insight || '').replace(/[<>]/g, ''), 170) : '',
    quote: cleanQuote(tidyEnd(r.quote, 140))
  }))
  // Answers that still fail after the re-ask don't ship their bad text: a failing effect becomes the
  // code-written line and a failing insight is dropped (the quote stays; the UI needs one).
  const scrub = (r, p, i) => {
    if (!check(r, p)) return r
    const blank = { ...r, effect: '', insight: '' }
    if (check(blank, p)) return r     // the problem is in the quote or labels; reconcile() handles labels
    const ok = f => !check({ ...blank, [f]: r[f] }, p)
    return { ...r, effect: ok('effect') ? r.effect : plan[i].touched ? '' : bystanderEffect(plan[i].rel, lawful), insight: ok('insight') ? r.insight : '', flagged: true }
  }
  const tasks = personas.map((p, i) => async s => {
    const first = await ask(p, i, s)
    const problem = check(first, p)
    // A duplicate quote from a resident the rule doesn't touch isn't worth a whole extra call.
    if (!problem || (!plan[i].touched && problem.startsWith('your quote repeats'))) return accept(reconcile(first, lawful))
    // One re-ask with the specific problem named. Keep the second answer if it fixed that problem
    // (even if a smaller one remains); otherwise keep the first.
    const second = await ask(p, i, s, `\n\nYour previous answer was inconsistent: ${problem}. Answer again, consistent with the facts about you.`).catch(() => null)
    const final = second && check(second, p) !== problem ? { ...second, reasked: true } : first
    return accept(reconcile(scrub(final, p, i), lawful))
  })
  const todo = personas.map((_, i) => i).filter(i => !known[i])
  const live = await runPool(todo.map(i => tasks[i]), {
    concurrency: 2,
    signal,
    onResult: (j, r) => onResult?.(todo[j], personas[todo[j]], r ?? { error: true })
  })
  const results = [...known]
  todo.forEach((i, j) => { results[i] = live[j] })
  if (!signal?.aborted) {
    lastCrowd.set(ordinanceText, { personas, results })
    const fresh = Object.fromEntries(todo.filter((i, j) => live[j] && !live[j].error).map((i, j) => [personas[i].id, stripSource(results[i])]))
    saveRun(ordinanceText, cacheKey(), { crowd: fresh })
  }
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
// If runCrowd already ran on the same text, panelists also see what the crowd said.
// Resolves to { [personaId]: result }.
export async function runPanel(ordinanceText, onToken, onDone, signal) {
  const out = {}
  const crowd = lastCrowd.get(ordinanceText)
  const size = crowd?.personas.length || 0
  const entry = await cachedRun(ordinanceText)
  const kept = entry?.bySize?.[size]?.panel
  if (kept) {
    for (const p of PANEL) {
      if (signal?.aborted) break
      out[p.id] = { ...kept[p.id], source: entry.origin }
      onToken?.(p.id, preview(JSON.stringify(kept[p.id] || {})))
      onDone?.(p.id, out[p.id])
      await pause(120)
    }
    return out
  }
  const { text: brief, issues } = await briefOrText(ordinanceText)
  const neighbors = crowd ? neighborsDigest(crowd.personas, crowd.results) : ''
  const tasks = PANEL.map((p, i) => async s => {
    const system = PANEL_SYSTEM + (p.id === 'atty' ? LOOPHOLE_SYSTEM_EXTRA : '')
    const issue = issues.length ? issues[i % issues.length] : ''
    return chatStream({
      system, user: panelUser(p, ordinanceText, brief === ordinanceText ? '' : brief, neighbors, issue), schema: panelSchema,
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
  if (!signal?.aborted && size && PANEL.every(p => out[p.id] && !out[p.id].error)) saveRun(ordinanceText, cacheKey(), { size, panel: out })
  return out
}

// ---------- Report ----------
// crowdResults: array of reactions in persona order (what runCrowd returns), or
//               array of { persona, reaction } / sparse arrays; all are accepted.
// panelResults: { [personaId]: result } (what runPanel returns) or an array of results.
// Returns { headline, most_affected[], top_loopholes[], amendments[{ clause, change, reason }],
//           verdict: 'revise' | 'withdraw', legality: 'likely valid' | 'questionable' | 'likely unconstitutional',
//           fairness: { byIncome: [{ bracket, n, avgImpact, opposeShare }], flag: string | null },
//           insights: [{ text, count, groups[], avgImpact }] }  (grouped resident concerns, code only).
// verdict 'withdraw' = the draft failed the legal/ethical check; top_loopholes then lists legal problems.
// fairness is computed in code (no model): flag says whether low earners carry the burden.
export async function runReport(ordinanceText, crowdResults, panelResults) {
  const reactions = Array.from(crowdResults, x => {
    const r = x?.reaction ?? x
    return r && !r.error && r.stance ? r : null
  })
  const personas = PERSONAS_200.slice(0, reactions.length)
  const kept = (await cachedRun(ordinanceText))?.bySize?.[reactions.length]?.report
  if (kept) return kept
  const summary = summarizeCrowd(personas, reactions)
  const fairness = fairnessLens(personas, reactions)
  const insights = clusterInsights(personas, reactions)

  const panelArr = Array.isArray(panelResults) ? panelResults : PANEL.map(p => panelResults?.[p.id])
  const panelAnswers = PANEL.map((p, i) => {
    const a = panelArr[i]
    return { name: p.name, role: p.role, answer: a && !a.error && a.loophole ? a : null }
  })

  // Legal and ethical check decides which report prompt runs (see REPORT_UNLAWFUL_SYSTEM).
  let brief = null
  try { brief = await getBrief(ordinanceText) } catch (err) { if (err.message?.startsWith('Ollama not running')) throw err }
  const unlawful = !!brief && (brief.targets_identity === true || brief.legality === 'likely unconstitutional')
  const legal = legalCheckText(brief)
  const user = reportUser(ordinanceText, summary, panelAnswers, legal, fairness.flag, insights, brief?.issues || [])
  const system = unlawful ? REPORT_UNLAWFUL_SYSTEM : REPORT_SYSTEM
  const call = (temperature, note = '') => chat({ system, user: user + note, schema: reportSchema, numPredict: 900, temperature })

  let report
  try {
    report = await call(0.4)
  } catch (err) {
    if (err.message?.startsWith('Ollama not running')) throw err
    report = await call(0.6)     // one retry on bad JSON or a repetition loop, with a little more variety
  }
  // Every amendment must point at a section that exists; one retry naming the bad clauses.
  const bad = missingSections(ordinanceText, report.amendments)
  if (bad.length) {
    const have = [...new Set([...ordinanceText.matchAll(/Section\s+(\d+)/gi)].map(m => m[1]))].join(', ')
    const retry = await call(0.4, `\n\nYour amendments cited sections that do not exist (${bad.join('; ')}). This ordinance only has Sections ${have}. Use those, or write "New section".`).catch(() => null)
    if (retry && !missingSections(ordinanceText, retry.amendments).length) report = retry
  }
  // The headline must match the numbers (the model once wrote "Residents Oppose" at 63% support).
  const majority = majorityOf(summary)
  if (headlineContradicts(report.headline, majority)) {
    const retry = await call(0.4, `\n\nYour headline contradicted the numbers: ${majority.label}. Write a headline that matches them.`).catch(() => null)
    if (retry && !headlineContradicts(retry.headline, majority) && !missingSections(ordinanceText, retry.amendments).length) report = retry
    else report = { ...report, headline: `${majority.label.charAt(0).toUpperCase() + majority.label.slice(1)}; top concern: ${(report.top_loopholes?.[0] || 'see details').replace(/\.$/, '')}.` }
  }
  const { analysis, ...visible } = report     // the scratchpad stays private
  const final = { ...visible, verdict: unlawful ? 'withdraw' : 'revise', legality: brief?.legality ?? 'unknown', fairness, insights }
  saveRun(ordinanceText, cacheKey(), { size: reactions.length, report: final })
  return final
}

// Majority stance as data + a plain label, e.g. { stance: 'support', pct: 63, label: 'most residents support it (63%)' }.
function majorityOf({ stance, total }) {
  const [top, n] = Object.entries(stance).sort((a, b) => b[1] - a[1])[0]
  const pct = total ? Math.round(n / total * 100) : 0
  return { stance: pct > 50 ? top : null, pct, label: pct > 50 ? `most residents ${top === 'mixed' ? 'are mixed' : top + ' it'} (${pct}%)` : `no majority; the largest group is ${top} (${pct}%)` }
}
const OPPOSE_WORDS = /\b(oppose[sd]?|opposition|reject(s|ed)?|against|resist(s|ance)?|backlash|outrage)\b/i
const SUPPORT_WORDS = /\b(support(s|ed)?|welcome[sd]?|back(s|ed)?|embrace[sd]?|approve[sd]?)\b/i
function headlineContradicts(headline = '', majority) {
  if (majority.stance === 'support') return OPPOSE_WORDS.test(headline) && !SUPPORT_WORDS.test(headline)
  if (majority.stance === 'oppose') return SUPPORT_WORDS.test(headline) && !OPPOSE_WORDS.test(headline)
  return false
}

// Extra (additive): fairness lens for a crowd run, usable live before the report.
export function getFairness(crowdResults) {
  const reactions = Array.from(crowdResults, x => { const r = x?.reaction ?? x; return r && !r.error && r.stance ? r : null })
  return fairnessLens(PERSONAS_200.slice(0, reactions.length), reactions)
}

// Extra (additive): grouped resident concerns for a crowd run, usable live before the report.
// [{ text, count, groups[], avgImpact }], most important first: "Raised by 12 residents".
export function getInsights(crowdResults, n = 6) {
  const reactions = Array.from(crowdResults, x => { const r = x?.reaction ?? x; return r && !r.error && r.stance ? r : null })
  return clusterInsights(PERSONAS_200.slice(0, reactions.length), reactions, n)
}

// ---------- Togetherness summary ----------
// What the community actually thinks, in 2-3 sentences, right after the crowd finishes.
// Returns { mood, summary, source: 'model' | 'code' }. mood comes from the real split (code);
// the model writes only the sentences, and the code summary is used if the model fails or contradicts the numbers.
export function getQuickSummary(crowdResults) {
  const reactions = Array.from(crowdResults, x => { const r = x?.reaction ?? x; return r && !r.error && r.stance ? r : null })
  return quickSummary(PERSONAS_200.slice(0, reactions.length), reactions)
}

export async function runSummary(ordinanceText, crowdResults, signal) {
  const reactions = Array.from(crowdResults, x => { const r = x?.reaction ?? x; return r && !r.error && r.stance ? r : null })
  const personas = PERSONAS_200.slice(0, reactions.length)
  const quick = quickSummary(personas, reactions)
  if (!reactions.some(Boolean)) return quick
  const kept = (await cachedRun(ordinanceText))?.bySize?.[reactions.length]?.summary
  if (kept) return kept
  let brief = null
  try { brief = await getBrief(ordinanceText) } catch (err) { if (err.message?.startsWith('Ollama not running')) throw err }
  const legal = brief && (brief.targets_identity || brief.legality !== 'likely valid') ? legalCheckText(brief) : ''
  try {
    const r = await chat({ system: SUMMARY_SYSTEM, user: summaryUser(ordinanceText, personas, reactions, legal), schema: summarySchema, numPredict: 260, temperature: 0.3, seed: 7, signal })
    const text = tidyEnd((r.summary || '').trim(), 600)
    const majority = majorityOf(summarizeCrowd(personas, reactions))
    if (text.split(/\s+/).length < 12 || headlineContradicts(text, majority)) return quick
    const result = { mood: quick.mood, summary: text, source: 'model' }
    saveRun(ordinanceText, cacheKey(), { size: reactions.length, summary: result })
    return result
  } catch (err) {
    if (err.message?.startsWith('Ollama not running') || signal?.aborted) throw err
    return quick
  }
}

// Extra (additive): highlights for the summary card, computed in code (no model call), so cached and
// saved runs get them too. { top_benefit, top_concern } or null; top_concern is the residents'
// most-raised point when there is one.
export async function getSummaryHighlights(ordinanceText, crowdResults) {
  const reactions = Array.from(crowdResults, x => { const r = x?.reaction ?? x; return r && !r.error && r.stance ? r : null })
  let brief = null
  try { brief = await getBrief(ordinanceText) } catch { /* no brief: benefit stays empty */ }
  const top = clusterInsights(PERSONAS_200.slice(0, reactions.length), reactions, 1)[0]
  const benefit = brief?.public_benefit && !/^\s*(none|not stated)/i.test(brief.public_benefit) ? brief.public_benefit : ''
  return {
    top_benefit: benefit,
    top_concern: top ? `${top.text.replace(/\.$/, '')} (raised by ${top.count} ${top.count === 1 ? 'resident' : 'residents'})` : ''
  }
}

// Extra (additive): attach-file and paste helpers for the draft box (see extract.js).
// readOrdinanceFile(file) -> { text, note }; prepareDraft(text) -> { text, note }.
export { readOrdinanceFile, prepareDraft } from './extract.js'
export { percents } from './prompts.js'

// ---------- Council memo ----------
// One-page, print-ready brief of a finished run (see lib/memo.js). data: { draft, residents, results,
// report, togetherness, source }. printCouncilMemo opens the print dialog (Save as PDF works);
// downloadCouncilMemo saves the same page as .html.
export const printCouncilMemo = data => printMemo({ model: MODEL, engineVersion: ENGINE_VERSION, ...data })
export const downloadCouncilMemo = data => downloadMemo({ model: MODEL, engineVersion: ENGINE_VERSION, ...data })
export const buildCouncilMemo = data => buildMemoHtml({ model: MODEL, engineVersion: ENGINE_VERSION, ...data })

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
