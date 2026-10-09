// Council memo: a print-ready one-page brief of a finished run (headline, who is hurt, loopholes,
// amendments, what residents said), for a councilor to bring to a committee hearing or attach to a
// draft. Built from data already on screen, so it needs no model call and works offline.
// printCouncilMemo() opens the browser's print dialog (Save as PDF works too) through a hidden
// iframe, so no popup blocker gets in the way; downloadCouncilMemo() saves the same page as .html.

import { percents } from './prompts.js'

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
// Long model text would push the memo onto a second page; cut at a word boundary.
const clip = (s, n) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length <= n ? t : t.slice(0, t.lastIndexOf(' ', n - 1) > n * 0.6 ? t.lastIndexOf(' ', n - 1) : n - 1).replace(/[,;:\s]+$/, '') + '…' }
const pct = (k, n) => n ? Math.round(k / n * 100) : 0

// The ordinance title: its first heading-like line (e.g. "AN ORDINANCE PROHIBITING ..."), else line one.
function titleOf(draft = '') {
  const lines = draft.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const t = lines.find(l => /^an ordinance\b/i.test(l)) || lines.find(l => /ordinance/i.test(l)) || lines[0] || 'Untitled draft'
  return clip(t, 140)
}

// Residents whose simulated week changes most, by job, from the crowd itself (numbers, not model text).
function hardestHit(residents, byId) {
  const groups = new Map()
  for (const p of residents) {
    const r = byId(p)
    if (!r || r.error || !r.stance) continue
    const g = groups.get(p.job) || { job: p.job, n: 0, impact: 0, oppose: 0 }
    g.n++; g.impact += r.impact || 0; if (r.stance === 'oppose') g.oppose++
    groups.set(p.job, g)
  }
  const min = residents.length >= 100 ? 2 : 1
  return [...groups.values()].filter(g => g.n >= min)
    .map(g => ({ ...g, avg: g.impact / g.n }))
    .sort((a, b) => b.avg - a.avg || b.n - a.n).slice(0, 4)
}

// data: { draft, residents: [{ id, job, ... }], results: { [id]: reaction } | reaction[], report,
//         togetherness: { mood, summary }, source: 'saved' | 'memory' | null, model, engineVersion, date }
export function buildMemoHtml(data) {
  const { draft = '', residents = [], results = {}, report = {}, togetherness, source, model = 'gemma3:4b', engineVersion = '' } = data
  const date = data.date || new Date()
  const byId = p => Array.isArray(results) ? results[residents.indexOf(p)] : results[p.id]
  const reactions = residents.map(byId).filter(r => r && !r.error && r.stance)
  const n = reactions.length
  const count = (k, v) => reactions.filter(r => r[k] === v).length
  const split = { support: count('stance', 'support'), mixed: count('stance', 'mixed'), oppose: count('stance', 'oppose') }
  const comply = { comply: count('comply', 'comply'), partial: count('comply', 'partial'), evade: count('comply', 'evade') }
  const [ps, pm, po] = percents([split.support, split.mixed, split.oppose])
  const [cc, cp, ce] = percents([comply.comply, comply.partial, comply.evade])
  const hit = hardestHit(residents, byId)
  const withdraw = report?.verdict === 'withdraw'
  const verdict = withdraw ? 'Withdraw or rewrite: legal and ethical problems found' : 'Revise before filing'
  const list = (items, n, len) => (items || []).filter(Boolean).slice(0, n).map(x => `<li>${esc(clip(x, len))}</li>`).join('') || '<li class="none">None identified in this run.</li>'
  const amendments = (report?.amendments || []).slice(0, 3).map(a => `<li><b>${esc(clip(a.clause, 60))}:</b> ${esc(clip(a.change, 165))}<div class="why">Why: ${esc(clip(a.reason, 120))}</div></li>`).join('')
    || '<li class="none">No amendments were returned.</li>'
  const points = (report?.insights || []).slice(0, 3).map(c => `<li>${esc(clip(c.text, 140))} <span class="n">(${c.count} resident${c.count === 1 ? '' : 's'})</span></li>`).join('')
  const hitRows = hit.map(g => `<tr><td>${esc(clip(g.job, 44))}</td><td>${g.n}</td><td>${g.avg.toFixed(1)}/5</td><td>${pct(g.oppose, g.n)}%</td></tr>`).join('')
  const runLabel = source === 'saved' ? 'saved run, computed earlier on this laptop' : source === 'memory' ? 'remembered run on this laptop' : 'live run on this laptop'
  const when = date.toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Council memo: ${esc(clip(titleOf(draft), 80))}</title>
<style>
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 9.2pt/1.36 "Segoe UI", Arial, sans-serif; color: #1d1d1d; background: #fff;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { max-width: 182mm; margin: 0 auto; padding: 6mm 0; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1d1d1d; padding-bottom: 5px; }
  .kicker { font-size: 8pt; letter-spacing: .12em; text-transform: uppercase; color: #4b5d52; font-weight: 700; }
  .meta { font-size: 8pt; color: #555; text-align: right; }
  h1 { font-size: 13pt; margin: 7px 0 2px; line-height: 1.25; }
  .headline { font-size: 11pt; font-weight: 600; margin: 6px 0 8px; }
  .stats { display: flex; gap: 14px; flex-wrap: wrap; font-size: 8.8pt; margin-bottom: 4px; }
  .stats b { font-size: 10pt; }
  .bar { display: flex; height: 9px; border-radius: 4px; overflow: hidden; margin: 3px 0 2px; background: #e6e6e6; }
  .bar span { display: block; height: 100%; }
  .s { background: #2f7d55; } .m { background: #d9a62e; } .o { background: #b5473a; }
  .verdict { display: inline-block; margin-top: 6px; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 8.8pt;
    background: ${withdraw ? '#f6dcd8' : '#e7efe9'}; color: ${withdraw ? '#8a2b20' : '#24563b'}; }
  h2 { font-size: 9pt; letter-spacing: .08em; text-transform: uppercase; margin: 10px 0 3px; color: #2b3a31; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  p { margin: 0 0 4px; }
  ul, ol { margin: 0; padding-left: 16px; }
  li { margin: 0 0 3px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 8.4pt; margin-top: 4px; }
  th, td { text-align: left; padding: 2px 4px; border-bottom: 1px solid #e2e2e2; }
  th { font-weight: 600; color: #555; }
  .why { color: #555; font-size: 8.6pt; }
  .n { color: #666; font-size: 8.4pt; }
  .none { color: #777; list-style: none; margin-left: -16px; }
  footer { margin-top: 10px; padding-top: 5px; border-top: 1px solid #1d1d1d; font-size: 7.8pt; color: #444; }
  footer b { color: #1d1d1d; }
  @media screen { body { background: #f1f1ee; } .page { background: #fff; padding: 14mm; margin: 16px auto; box-shadow: 0 1px 6px rgba(0,0,0,.15); } }
</style></head>
<body><div class="page">
<header><div><div class="kicker">Council memo · Draft ordinance pre-consultation brief</div></div>
<div class="meta">${esc(when)}<br>LawGetherness · offline simulation</div></header>
<h1>${esc(titleOf(draft))}</h1>
<p class="headline">${esc(clip(report?.headline || '', 180))}</p>
<div class="stats"><span><b>${n}</b> simulated residents</span><span>Support <b>${ps}%</b></span><span>Mixed <b>${pm}%</b></span><span>Oppose <b>${po}%</b></span><span>Would comply fully <b>${cc}%</b> · partly ${cp}% · evade ${ce}%</span></div>
<div class="bar" role="img" aria-label="Support ${ps}%, mixed ${pm}%, oppose ${po}%"><span class="s" style="width:${ps}%"></span><span class="m" style="width:${pm}%"></span><span class="o" style="width:${po}%"></span></div>
<span class="verdict">Recommendation: ${esc(verdict)}</span>
${togetherness?.summary ? `<h2>What residents think</h2><p>${togetherness.mood ? `<b>${esc(togetherness.mood)}.</b> ` : ''}${esc(clip(togetherness.summary, 320))}</p>` : ''}
<div class="cols">
  <div><h2>Who is hurt most</h2><ul>${list(report?.most_affected, 4, 110)}</ul>
  ${hitRows ? `<table><thead><tr><th>Simulated group</th><th>n</th><th>Avg impact</th><th>Oppose</th></tr></thead><tbody>${hitRows}</tbody></table>` : ''}</div>
  <div><h2>Loopholes to close</h2><ul>${list(report?.top_loopholes, 4, 120)}</ul>
  ${points ? `<h2>Points residents raised most</h2><ul>${points}</ul>` : ''}</div>
</div>
<h2>Recommended amendments</h2><ol>${amendments}</ol>
<footer><b>Simulated reactions from a small local model, not a real survey.</b> ${esc(n)} residents generated from approximate Philippine population traits reacted to this draft through ${esc(model)} running locally (${esc(runLabel)}${engineVersion ? `, engine ${esc(engineVersion)}` : ''}). Use this memo to prepare a public consultation, not to replace one. No draft text left this device.</footer>
</div></body></html>`
}

// Opens the print dialog for the memo (the user can pick "Save as PDF"). Returns false if printing
// is unavailable, so the caller can fall back to downloadCouncilMemo().
export function printCouncilMemo(data) {
  if (typeof document === 'undefined') return false
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.setAttribute('tabindex', '-1')
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0', visibility: 'hidden' })
  document.body.appendChild(frame)
  const win = frame.contentWindow
  if (!win) { frame.remove(); return false }
  win.document.open(); win.document.write(buildMemoHtml(data)); win.document.close()
  const cleanup = () => setTimeout(() => frame.remove(), 500)
  win.addEventListener('afterprint', cleanup)
  setTimeout(() => {
    try { win.focus(); win.print() } catch { frame.remove(); downloadCouncilMemo(data) }
    setTimeout(() => frame.isConnected && frame.remove(), 120000)   // fallback if afterprint never fires
  }, 60)
  return true
}

// Saves the memo as a standalone .html file (opens in any browser, prints to one page).
export function downloadCouncilMemo(data) {
  if (typeof document === 'undefined') return
  const blob = new Blob([buildMemoHtml(data)], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: `council-memo-${titleOf(data.draft).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40).replace(/-+$/, '') || 'draft'}.html` })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
