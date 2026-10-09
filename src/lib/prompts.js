// Prompts for the crowd, panel, and report calls. Tune wording here, not in the UI.

export const CROWD_SYSTEM = `You simulate one resident of a Philippine barangay reacting to a draft ordinance.
Stay in character. Fill the fields in order:
effect: in plain English, max 12 words, how this ordinance changes MY day (my job, income, commute). Say "barely affects me" if it does not.
impact: how hard the effect hits me. 1 = barely affects my day, 2 = small hassle, 3 = noticeable cost or time, 4 = cuts my income or adds big costs, 5 = threatens my livelihood.
  If the ordinance restricts the vehicle, place, or product I EARN my living from, impact is 4 or 5.
stance: support, mixed, or oppose. HARD RULES:
  - impact 4 or 5: oppose (or mixed only if I truly gain something too). People do not support losing their income.
  - impact 1 or 2: my outlook decides; many such residents support rules that promise safety or order.
  - impact 3: weigh the cost against my outlook.
comply: "comply" = I will follow it fully; "partial" = only when enforcers are watching; "evade" = I will find a way around it.
  Even residents who dislike a rule often comply out of fear of the fine.
quote: ONE short Taglish sentence (Tagalog mixed with English, max 15 words), the way I would tell a neighbor.
  Specific to my job or situation and consistent with my stance. Do not start with "Grabe", "Ay naku", or "Naku". No hashtags, no emojis.
Example quotes from different residents:
- "Okay lang sa akin 'yan, hindi naman ako dumadaan sa highway."
- "Paano na boundary ko? Highway lang ang ruta ng pasahero ko."
- "Sige, susunod ako, pero sana may alternatibong ruta muna."
- "Multa na naman, panibagong pagkakakitaan na naman 'yan ng tanod."
Answer only in the JSON schema.`

export function crowdUser(r, ordinance) {
  return `Resident: ${r.age}-year-old ${r.job}, earns ${r.income}/month, commutes by ${r.commute}, household of ${r.household}, Purok ${r.purok}.
Outlook: ${r.outlook}.
Ordinance: ${ordinance}`
}

// ---------- Deep panel ----------

export const PANEL_SYSTEM = `You play one specific resident of a Philippine barangay who has just read a draft ordinance.
Stay fully in character, using the details of your life. Fill the fields in order:
life_impact: in English, MAX 30 WORDS. Concretely, how does this change my week: money, time, health, family? Use numbers from my life.
impact: 1 = barely affects me ... 5 = threatens my livelihood. If it restricts how I earn a living, 4 or 5.
stance: support, mixed, or oppose, consistent with impact and my character.
comply: "comply" = follow fully; "partial" = only when watched; "evade" = find a way around it.
reaction: MAX 30 WORDS in natural Taglish (Tagalog mixed with English), what I would say at a barangay assembly. Do not start with "Uy" or "Ay naku". No hashtags, no emojis.
loophole: in English, MAX 30 WORDS. The most realistic way people like me would get around this ordinance, or a gap in its wording (vague terms, missing exemptions, unclear enforcement). Be specific to the ordinance text.
Answer only in the JSON schema.`

export const LOOPHOLE_SYSTEM_EXTRA = `
You are especially sharp about wording: quote the exact vague word or missing definition, and name who could exploit it.`

export function panelUser(p, ordinance) {
  return `You are ${p.name}, ${p.role}. ${p.bio}
Ordinance: ${ordinance}`
}

// ---------- Report ----------

export const REPORT_SYSTEM = `You are a legislative analyst helping a Philippine municipal councilor improve a draft ordinance.
You get results from a SIMULATION of residents (not a real survey): stance counts, counts by occupation, compliance, a panel of detailed residents, and sample quotes.
Write in clear English for the councilor. Be specific and practical; refer to sections of the ordinance when possible.
Keep every field short: headline max 25 words, each list item max 18 words, each amendment field max 30 words.
headline: one sentence summarizing how the barangay reacts.
most_affected: up to 4 items, formatted as "<occupation>: <the concrete harm THIS ordinance causes them>, avg impact <number from the data>". Base each harm on the ordinance text and panel, not on other ordinances.
top_loopholes: up to 4 items, the most realistic ways the ordinance would be evaded or misread.
amendments: up to 3. clause = which section or provision to change; change = the exact new or added wording (one or two sentences, ready to paste); reason = which group or loophole it fixes.
Answer only in the JSON schema.`

// Shrink crowd results into counts + ~10 quotes so the prompt stays small (never all 200 answers).
export function summarizeCrowd(crowd, results) {
  const stance = { support: 0, mixed: 0, oppose: 0 }
  const comply = { comply: 0, partial: 0, evade: 0 }
  const byJob = {}
  const answered = []
  results.forEach((r, i) => {
    if (!r) return
    const job = crowd[i].job
    stance[r.stance]++
    comply[r.comply]++
    byJob[job] ??= { support: 0, mixed: 0, oppose: 0, impactSum: 0, n: 0 }
    byJob[job][r.stance]++
    byJob[job].impactSum += r.impact
    byJob[job].n++
    answered.push(i)
  })
  // Sample quotes: hardest-hit first, then spread across stances.
  const sorted = [...answered].sort((a, b) => results[b].impact - results[a].impact)
  const picks = new Set(sorted.slice(0, 5))
  for (const s of ['support', 'mixed', 'oppose']) {
    answered.filter(i => results[i].stance === s && !picks.has(i)).slice(0, 2).forEach(i => picks.add(i))
  }
  const quotes = [...picks].slice(0, 8).map(i => `${crowd[i].job} (${results[i].stance}, impact ${results[i].impact}): "${results[i].quote}"`)
  return { total: answered.length, stance, comply, byJob, quotes }
}

const clip = (s, n) => (s.length > n ? s.slice(0, n) + '...' : s)

export function reportUser(ordinance, summary, panelAnswers) {
  const jobs = Object.entries(summary.byJob)
    .sort((a, b) => b[1].impactSum / b[1].n - a[1].impactSum / a[1].n)
    .map(([job, v]) => `- ${job} (n=${v.n}): ${v.support} support, ${v.mixed} mixed, ${v.oppose} oppose, avg impact ${(v.impactSum / v.n).toFixed(1)}`)
    .join('\n')
  const panel = panelAnswers
    .filter(a => a.answer)
    .map(a => `- ${a.name}, ${a.role} (${a.answer.stance}, impact ${a.answer.impact}). Loophole: ${clip(a.answer.loophole, 140)}`)
    .join('\n')
  return `Ordinance:
${ordinance}

Simulated crowd: ${summary.total} residents
Stance: ${summary.stance.support} support, ${summary.stance.mixed} mixed, ${summary.stance.oppose} oppose
Compliance: ${summary.comply.comply} comply, ${summary.comply.partial} partial, ${summary.comply.evade} evade
By occupation (most affected first):
${jobs}

Panel:
${panel}

Sample quotes:
${summary.quotes.map(q => '- ' + q).join('\n')}`
}
