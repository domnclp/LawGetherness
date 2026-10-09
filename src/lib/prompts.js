// Prompts for the brief, crowd, panel, and report calls. Tune wording here, not in the UI.

const RESPECT = 'Stay respectful even when opposed: no slurs, insults, or demeaning words about any group.'

// ---------- Brief (one call per ordinance) ----------
// A small model misreads legal text in many different ways; reading it once into
// plain facts and handing those to every resident keeps 200 reactions consistent.

export const BRIEF_SYSTEM = `You explain a Philippine city ordinance in plain English for ordinary residents.
Use ONLY what the text says. If something is not stated, write "not stated". Never invent fines or details.
summary: one sentence, max 25 words, what the ordinance does.
who_must_change: up to 5 specific groups whose behavior must change (e.g. "smokers", "store owners", "parents of minors"). Never list "residents", "everyone", or "city officials".
what_changes: max 25 words, exactly what those people must stop or start doing.
where_when: max 20 words. penalty: max 20 words. exemptions: max 25 words.
Answer only in the JSON schema.`

export function briefUser(ordinance) {
  return `Ordinance:\n${ordinance}`
}

export function briefText(b) {
  return `${b.summary}
Who must change: ${b.who_must_change.join(', ') || 'not stated'}
What changes: ${b.what_changes}
Where/when: ${b.where_when}
Penalty: ${b.penalty}
Exemptions: ${b.exemptions}`
}

// ---------- Crowd ----------

export const CROWD_SYSTEM = `You simulate one adult resident of a Philippine barangay reacting to a city ordinance, as if it applied where you live.
Think like a real person: a rule matters to you only if it touches what you actually do, own, sell, or are.
You are told which parts of your life the ordinance touches and facts about what you do NOT do. Trust them completely; never claim a habit you do not have. Fill the fields in order:
touches_me: "directly" = it restricts something I personally do, own, sell, or am; "indirectly" = it changes my customers, costs, family, health, neighbors, or surroundings in a way I would notice; "not really" = nothing in my day changes. Most residents are not directly touched by any one ordinance.
effect: plain English, max 15 words, what concretely changes in MY week. Name the specific thing (my cigarettes, my stall's plastic bags, my teenager's nights out, my street parking). If "not really", say so.
impact: 1 = barely affects my day, 2 = small hassle, 3 = noticeable cost, time, or habit change, 4 = cuts my income or adds big costs, 5 = threatens my livelihood.
  "not really" means impact 1 or 2. If it restricts how I EARN my living, 4 or 5. If it restricts a personal habit of mine, 3 or 4.
stance: support, mixed, or oppose.
  - If the ordinance PROTECTS me or my family, I support it.
  - impact 4 or 5: oppose, or mixed if I also truly see the benefit.
  - impact 1 or 2: my outlook and values decide; most such residents support rules that promise safety, health, cleanliness, fairness, or order.
  - impact 3: weigh the cost against my outlook and values.
  - For social rules, values matter: traditional residents often favor curfews and discipline; progressive residents often favor anti-discrimination and personal freedom.
comply: "comply" = follow it fully; "partial" = only when enforcers are watching; "evade" = find a way around it.
  If impact is 1 or 2, I comply fully unless I distrust officials. Many who dislike a rule still comply out of fear of the penalty.
quote: ONE Taglish sentence (Tagalog mixed with English, max 15 words), what I would tell a neighbor, in my voice.
  If it touches me, say how, naming the specific thing (my cigarettes, my bags, my anak, my parking).
  If it does not touch me, do NOT say I am unaffected and do NOT say "we must follow it for the barangay"; speak from my angle instead, concretely.
  Only mention things in MY profile; never invent a job, vehicle, habit, or family I do not have.
  ${RESPECT} No hashtags, no emojis, no quotation marks. Do not start with "Grabe" or "Naku".
Example quotes from different residents (tone only, never copy):
- "Okay lang sa akin 'yan, hindi naman ako naninigarilyo."
- "Isang kaha isang araw ako, saan na ako yoyosi ngayon?"
- "Mabuti 'yan, para hindi na gabi-gabing gumagala anak ko."
- "Opo, susunod po kami, pero sana may libreng eco-bag muna sa palengke."
Answer only in the JSON schema.`

// Small models open most Filipino sentences with an interjection ("Ay,", "Uy,", "Naku,").
// Strip one leading interjection and stray quote marks so the grid shows varied, clean quotes.
const INTERJECTION = /^(ay naku|ay nako|naku|nako|ay|uy|hay|hay naku|grabe|ano ba|aba|hala|eh)\b[\s,!.…'’]*/i
export function cleanQuote(q = '') {
  let s = q.trim().replace(/^["'‘’“”\s]+|["'‘’“”\s]+$/g, '')
  const stripped = s.replace(INTERJECTION, '')
  if (stripped.length > 12) s = stripped.charAt(0).toUpperCase() + stripped.slice(1)
  return s
}

// Which life details an ordinance can touch. A small model treats every detail it sees
// as relevant (a drinker thinks a smoking ban bans drinking), so residents only see the
// details whose topic actually appears in the ordinance.
// [detail pattern, ordinance topic pattern, what to say when the resident does NOT have it].
// The negative facts matter as much as the positive ones: told nothing, a small model
// assumes a resident reacting to a smoking ban must be a smoker.
const DETAIL_TOPICS = [
  [/minor \(under 18\)|teenager/, /minor|curfew|under 18|discipline hours|youth/, 'I am an adult and have no teenager at home'],
  [/smokes/, /smok|cigar|tobacco/, 'I do not smoke'],
  [/vapes/, /vap/, 'I do not vape'],
  [/young kids in elementary/, /school/, 'I have no young kids in school'],
  [/parks it on the street/, /park|curb/, 'I do not park a car on the street'],
  [/drives a|car with a garage/, /traffic|road|vehicle|idl|motorist|driver/, 'I do not drive; I ride as a passenger or walk'],
  [/drinks with neighbors/, /drink|liquor|alcohol/, 'I do not drink outside'],
  [/LGBTQ/, /sogiesc|sexual orientation|gender|discriminat/, 'I am not LGBTQ+'],
  [/plastic bags/, /plastic|bag/, 'I do not sell anything, so I give out no bags; I only receive them when I shop'],
  [/carinderia|food service/, /restaurant|cutlery|disposable|single-use/, 'I do not work in a restaurant or carinderia'],
  [/hires a few workers/, /employ|hire|discriminat|workplace/, 'I do not employ anyone'],
  [/takeout|food delivery/, /restaurant|cutlery|disposable|single-use|takeout/, 'I rarely order takeout'],
  [/wrappers/, /litter|rubbish|trash|spit|waste/, 'I throw my trash in bins'],
  // Panel-only details (null = no negative line needed)
  [/sells cigarettes/, /smok|cigar|tobacco|vap/, null],
  [/enforces barangay ordinances/, /penal|enforc|fine|violat|curfew|discipline/, null]
]

// Details for which an ordinance is a protection, not a burden. "Touches you" alone makes
// a small model assume harm (an asthmatic opposing a smoke ban near schools).
const PROTECTS = [
  [/asthma/, /smok|vap|idl|exhaust|air quality/],
  [/young kids in elementary/, /school zone/]
]

// { yes: details this ordinance restricts or burdens, protects: details it protects,
//   no: facts about what I do NOT do }
export function relevantDetails(details = [], ordinanceText = '', job = '') {
  const text = ordinanceText.toLowerCase()
  const yes = [], no = [], protects = []
  for (const [detail, topic] of PROTECTS) {
    if (topic.test(text)) protects.push(...details.filter(d => detail.test(d)))
  }
  for (const [detail, topic, negation] of DETAIL_TOPICS) {
    if (!topic.test(text)) continue
    const mine = details.filter(d => detail.test(d) && !protects.includes(d))
    if (mine.length) yes.push(...mine)
    // Sellers who don't hand out bags still sell; skip the "I do not sell" line for them.
    else if (negation && !details.some(d => detail.test(d)) &&
      !(negation.startsWith('I do not sell') && /vendor|sari-sari|small business|store/i.test(job))) no.push(negation)
  }
  return { yes: [...new Set(yes)], no: [...new Set(no)], protects: [...new Set(protects)] }
}

// Shared "how this ordinance meets my life" lines for crowd and panel prompts.
function factLines({ yes, no, protects }, noneLine) {
  return [
    yes.length ? `This ordinance restricts or burdens these parts of my life: ${yes.join('; ')}.` : '',
    protects.length ? `This ordinance PROTECTS me or my family: ${protects.join('; ')}.` : '',
    no.length ? `Facts about me: ${no.join('; ')}.` : '',
    !yes.length ? noneLine : ''
  ].filter(Boolean).join('\n')
}

// brief: plain-language ordinance text (briefText output), or the raw ordinance as fallback.
export function crowdUser(r, brief) {
  const rel = relevantDetails(r.details, brief, r.job)
  const { yes } = rel
  const touch = factLines(rel, 'So this ordinance restricts nothing I personally do, unless my job is named in "Who must change".')
  return `Resident: ${r.age}-year-old ${r.job} (${r.employment}), monthly income: ${r.income}, commutes by ${r.commute}, household of ${r.household}, Purok ${r.purok}.
${touch}
Values: ${r.values}. Outlook: ${r.outlook}. Voice: ${r.voice}.${yes.length ? '' : `\nMy angle on rules that don't touch me: ${r.angle}.`}
Ordinance in plain words:
${brief}`
}

// ---------- Deep panel ----------

export const PANEL_SYSTEM = `You play one specific resident of a barangay in Quezon City who has just read a city ordinance.
Think and speak like this real person, using the concrete details of your life: money, schedule, family, neighbors, customers.
Be specific, honest, and human. No generic statements, no slogans.
You are told which parts of your life this ordinance touches and facts about what you do NOT do. Trust them completely. Never invent habits, products, vehicles, or relatives that are not in your bio.
Fill the fields in order:
life_impact: English, 2 sentences, max 35 words. What actually changes in my week because of THIS ordinance: what, when, how much in pesos or minutes. If it barely touches me, say so and say who I know it does affect. If it protects me or my family, say how.
impact: 1 = barely affects me ... 5 = threatens my livelihood. If it restricts how I earn a living, 4 or 5. If it barely touches me, 1 or 2.
stance: support, mixed, or oppose, consistent with impact and my values. If the ordinance PROTECTS me or my family, support it.
comply: "comply" = follow fully; "partial" = only when watched; "evade" = find a way around it.
reaction: max 30 words of natural Taglish (Tagalog mixed with English), what I would say at a barangay assembly. Make one clear point. Do not start with "Uy" or "Ay naku". No hashtags, no emojis.
loophole: English, max 30 words. The most realistic way people would get around THIS ordinance, or a specific gap in its wording. Name the exact word, section, or missing detail.
what_would_help: English, max 30 words. One concrete change to the ordinance or its rollout that would make it work better for people like me.
${RESPECT}
Answer only in the JSON schema.`

export const LOOPHOLE_SYSTEM_EXTRA = `
You are especially sharp about wording: quote the exact vague word or missing definition, and name who could exploit it.`

export function panelUser(p, ordinance, brief) {
  const facts = factLines(relevantDetails(p.details, `${brief || ''}\n${ordinance}`, p.role), 'This ordinance restricts nothing I personally do.')
  return `You are ${p.name}, ${p.role}. ${p.bio}
${facts}
Ordinance (text):
${ordinance}
${brief ? `\nIn plain words:\n${brief}` : ''}`
}

// ---------- Report ----------

export const REPORT_SYSTEM = `You are a legislative analyst helping a Quezon City councilor improve an ordinance.
You get results from a SIMULATION of residents (not a real survey): stance counts, counts by occupation, compliance, a panel of detailed residents with their loopholes and suggested fixes, and sample quotes.
Write clear, specific English for the councilor. Refer to sections of the ordinance. Build amendments from the panel's suggested fixes and loopholes.
If the ordinance leaves key details unstated (penalties, definitions, exemptions, enforcement), say so and propose explicit wording.
Keep every field short: headline max 25 words, each list item max 18 words, each amendment field max 30 words.
headline: one sentence summarizing how residents react.
most_affected: up to 4 items, formatted as "<group>: <the concrete harm THIS ordinance causes them>, avg impact <number from the data>".
top_loopholes: up to 4 items, the most realistic ways the ordinance would be evaded or misread.
amendments: up to 3. clause = which section or provision to change; change = the exact new or added wording, ready to paste; reason = which group or loophole it fixes.
Answer only in the JSON schema.`

// Shrink crowd results into counts + a few quotes so the prompt stays small (never all 200 answers).
export function summarizeCrowd(crowd, results) {
  const stance = { support: 0, mixed: 0, oppose: 0 }
  const comply = { comply: 0, partial: 0, evade: 0 }
  const touches = { directly: 0, indirectly: 0, 'not really': 0 }
  const byJob = {}
  const byDetail = {}   // e.g. "smokes cigarettes daily" -> counts; key for social ordinances
  const add = (map, key, r) => {
    map[key] ??= { support: 0, mixed: 0, oppose: 0, impactSum: 0, n: 0 }
    map[key][r.stance]++
    map[key].impactSum += r.impact
    map[key].n++
  }
  const answered = []
  results.forEach((r, i) => {
    if (!r) return
    stance[r.stance]++
    comply[r.comply]++
    if (r.touches_me in touches) touches[r.touches_me]++
    add(byJob, crowd[i].group || crowd[i].job, r)
    for (const d of crowd[i].details || []) add(byDetail, d, r)
    answered.push(i)
  })
  // Sample quotes: hardest-hit first, then spread across stances.
  const sorted = [...answered].sort((a, b) => results[b].impact - results[a].impact)
  const picks = new Set(sorted.slice(0, 3))
  for (const s of ['support', 'mixed', 'oppose']) {
    answered.filter(i => results[i].stance === s && !picks.has(i)).slice(0, 1).forEach(i => picks.add(i))
  }
  const quotes = [...picks].slice(0, 4).map(i => `${crowd[i].job} (${results[i].stance}, impact ${results[i].impact}): "${results[i].quote}"`)
  return { total: answered.length, stance, comply, touches, byJob, byDetail, quotes }
}

// "- group (n=..): s/m/o, avg impact x" lines, most affected first.
function groupLines(map, limit, minN = 1) {
  return Object.entries(map)
    .filter(([, v]) => v.n >= minN)
    .sort((a, b) => b[1].impactSum / b[1].n - a[1].impactSum / a[1].n)
    .slice(0, limit)
    .map(([k, v]) => `- ${k} (n=${v.n}): ${v.support}/${v.mixed}/${v.oppose} support/mixed/oppose, avg impact ${(v.impactSum / v.n).toFixed(1)}`)
    .join('\n')
}

const clip = (s = '', n) => (s.length > n ? s.slice(0, n) + '...' : s)

export function reportUser(ordinance, summary, panelAnswers) {
  const jobs = groupLines(summary.byJob, 5)
  const details = groupLines(summary.byDetail, 4, 3)
  const panel = panelAnswers
    .filter(a => a.answer)
    .map(a => `- ${a.name}, ${a.role} (${a.answer.stance}, impact ${a.answer.impact}). Loophole: ${clip(a.answer.loophole, 100)} Fix: ${clip(a.answer.what_would_help, 100)}`)
    .join('\n')
  return `Ordinance:
${ordinance}

Simulated crowd: ${summary.total} residents
Stance: ${summary.stance.support} support, ${summary.stance.mixed} mixed, ${summary.stance.oppose} oppose
Compliance: ${summary.comply.comply} comply, ${summary.comply.partial} partial, ${summary.comply.evade} evade
Touched: ${summary.touches.directly} directly, ${summary.touches.indirectly} indirectly, ${summary.touches['not really']} not really
Most affected occupation groups:
${jobs}
Most affected by life situation:
${details}

Panel:
${panel}

Sample quotes:
${summary.quotes.map(q => '- ' + q).join('\n')}`
}
