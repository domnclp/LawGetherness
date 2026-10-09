// Prompts for the brief, crowd, panel, and report calls. Tune wording here, not in the UI.

const RESPECT = 'Stay respectful even when opposed: no slurs, insults, or demeaning words about any group.'

// ---------- Brief (one call per ordinance) ----------
// A small model misreads legal text in many different ways; reading it once into
// plain facts and handing those to every resident keeps 200 reactions consistent.

// Real Philippine legal and public-opinion facts the brief may cite. A 4B model does not
// reliably know these and will invent laws if asked open-ended, so it may only copy from here.
export const KNOWLEDGE = [
  '1987 Constitution, Bill of Rights (Art. III): Sec. 1 guarantees due process and equal protection of the laws; Sec. 4 free speech and peaceful assembly; Sec. 6 liberty of abode and travel; Sec. 19 bans cruel, degrading, or inhuman punishment.',
  'Local Government Code (RA 7160) Sec. 458: a city ordinance may impose at most a ₱5,000 fine, up to 1 year imprisonment, or both. Barangay ordinances may impose at most a ₱1,000 fine (Sec. 391).',
  'Supreme Court, Magtajas v. Pryce Properties (1994): a valid ordinance must not contravene the Constitution or any statute, must not be unfair or oppressive, must not be partial or discriminatory, may regulate but not prohibit trade, must be general and consistent with public policy, and must not be unreasonable.',
  'Being LGBTQ+ is not a crime under Philippine law. Laws may punish harmful acts, not who a person is.',
  'Safe Spaces Act (RA 11313, 2019): penalizes gender-based harassment, including homophobic and transphobic slurs, in streets, public spaces, online, workplaces, and schools.',
  'Several local governments, including Quezon City, have ordinances banning discrimination based on sexual orientation, gender identity and expression, and sex characteristics (SOGIESC).',
  'Pew Research Center (2019): 73% of Filipinos said homosexuality should be accepted by society.',
  'Juvenile Justice and Welfare Act (RA 9344, amended by RA 10630): minors are not penalized for status offenses like curfew violations; they are released to parents or referred to social workers.',
  'Executive Order 26 (2017) bans smoking in enclosed public places and public vehicles nationwide; RA 9211 regulates tobacco; RA 11900 (2022) regulates vapes.',
  'Ecological Solid Waste Management Act (RA 9003, 2000): requires waste segregation and prohibits littering in public places.',
  'Supreme Court, SPARK v. Quezon City (2017): upheld Quezon City\'s minor curfew because it had clear exemptions and was narrowly drawn; struck down Manila\'s and Navotas\'s curfews.'
]

export const BRIEF_SYSTEM = `You explain a Philippine city ordinance in plain English for ordinary residents, and check it against the law and basic ethics.
Use ONLY what the text says. If something is not stated, write "not stated". Never invent fines or details.
summary: one sentence, max 25 words, what the ordinance does.
who_must_change: up to 5 specific groups whose behavior must change or who are targeted (e.g. "smokers", "store owners", "parents of minors", "LGBTQ+ people"). Never list "residents", "everyone", or "city officials".
what_changes: max 25 words, exactly what those people must stop or start doing, or what is done to them.
where_when: max 20 words. penalty: max 20 words. exemptions: max 25 words.
targets_identity: true if it punishes or restricts people for WHO THEY ARE (sexual orientation, gender identity, religion, ethnicity, disability, poverty) rather than for a harmful ACT.
rights_issues: max 30 words. Which constitutional rights or national laws it may violate, using the facts below. "None apparent" if it is an ordinary regulation.
penalty_check: max 25 words. Is the penalty within what a city may impose (max ₱5,000 fine and/or 1 year jail) and proportionate to the harm? "Not stated" if no penalty is given.
public_benefit: max 20 words. The real benefit to the community, if any (health, safety, cleanliness). "None" if it only harms people.
legality: "likely valid" for ordinary regulations of harmful acts with fair penalties; "questionable" if vague, overbroad, or the penalty seems excessive; "likely unconstitutional" if it targets identity, punishes harmless conduct, exceeds penalty limits, or violates the Bill of Rights.
known_facts: up to 3 facts from the list below that are relevant to this ordinance, copied closely. Never invent laws, cases, or numbers. Empty if none apply.
Facts you may use:
${KNOWLEDGE.map(k => '- ' + k).join('\n')}
Answer only in the JSON schema.`

export function briefUser(ordinance) {
  return `Ordinance:\n${ordinance}`
}

// Penalty limits checked in code: the model misses numbers (it called "5 years and ₱20,000" "not stated").
// RA 7160 Sec. 458: a city ordinance may impose at most a ₱5,000 fine and/or 1 year imprisonment.
export function penaltyOverLimit(ordinance = '') {
  const text = ordinance.replace(/,/g, '')
  const fines = [...text.matchAll(/(?:₱|PHP|Php|P)\s?(\d{3,})/g)].map(m => Number(m[1]))
  const jailed = /imprison|jail|prison|kulong|arrest/i.test(text)
  const years = jailed ? [...text.matchAll(/(\d+)\)?\s*(?:years?|yrs?|taon)/gi)].map(m => Number(m[1])) : []
  const issues = []
  if (fines.some(f => f > 5000)) issues.push(`a fine of ₱${Math.max(...fines).toLocaleString()} (limit ₱5,000)`)
  if (years.some(y => y > 1)) issues.push(`${Math.max(...years)} years in jail (limit 1 year)`)
  return issues.length ? `Exceeds the legal maximum for a city ordinance under RA 7160 Sec. 458: ${issues.join(' and ')}.` : ''
}

// Applies code-side checks on top of the model's brief.
export function checkBrief(brief, ordinance) {
  const over = penaltyOverLimit(ordinance)
  if (!over) return brief
  return {
    ...brief,
    penalty_check: over,
    legality: brief.legality === 'likely valid' ? 'questionable' : brief.legality
  }
}

// A lawful ordinary regulation gets one short check line; the full legal analysis is shown only
// when something is wrong. For a 4B model the long block is noise on normal rules and muddles
// the reactions (support for a public smoking ban fell from 25/30 to 8/30 with it).
export function briefText(b) {
  const head = `${b.summary}
Who must change: ${b.who_must_change.join(', ') || 'not stated'}
What changes: ${b.what_changes}
Where/when: ${b.where_when}
Penalty: ${b.penalty}
Exemptions: ${b.exemptions}`
  if (b.legality === 'likely valid' && !b.targets_identity) {
    return `${head}\nLegal and ethical check: an ordinary, lawful regulation. Real benefit: ${b.public_benefit}`
  }
  return `${head}
Legal and ethical check:
- Punishes people for who they are: ${b.targets_identity ? 'YES' : 'no'}
- Rights and laws: ${b.rights_issues}
- Penalty: ${b.penalty_check}
- Real benefit: ${b.public_benefit}
- Legality: ${b.legality}${b.known_facts?.length ? `\nFacts most Filipinos know or can easily learn:\n${b.known_facts.map(f => '- ' + f).join('\n')}` : ''}`
}

// ---------- Crowd ----------

export const CROWD_SYSTEM = `You simulate one adult resident of a Philippine barangay reacting to a city ordinance, as if it applied where you live.
Think like a real person: a rule matters to you only if it touches what you actually do, own, sell, or are.
You are told which parts of your life the ordinance touches and facts about what you do NOT do. Trust them completely; never claim a habit you do not have. Fill the fields in order:
touches_me: "directly" = it restricts something I personally do, own, sell, or am; "indirectly" = it changes my customers, costs, family, health, neighbors, or surroundings in a way I would notice; "not really" = nothing in my day changes. Most residents are not directly touched by any one ordinance.
effect: plain English, max 15 words, what concretely changes in MY week. Name the specific thing (my cigarettes, my stall's plastic bags, my teenager's nights out, my street parking). If "not really", say so.
impact: 1 = barely affects my day, 2 = small hassle, 3 = noticeable cost, time, or habit change, 4 = cuts my income or adds big costs, 5 = threatens my livelihood.
  "not really" means impact 1 or 2. If it restricts how I EARN my living, 4 or 5. If it restricts a personal habit of mine, 3 or 4.
judgment: decide like a thoughtful, decent, informed Filipino adult, using the "Legal and ethical check":
  "good rule" = lawful, fair, and does real good (health, safety, children, cleanliness), at little cost to me.
  "good rule but costly for me" = lawful and useful, but it costs me money, time, or a habit (impact 3 or more).
  "unfair or harmful" = punishes people for who they are, jails people for harmless acts, uses excessive penalties, or is likely unconstitutional. This is wrong even if it does not touch me.
  "pointless" = will not really work or cannot be enforced.
stance: follow my judgment.
  "good rule" -> support. "good rule but costly for me" -> mixed, or oppose if it cuts my income (impact 4-5). "unfair or harmful" -> oppose. "pointless" -> mixed or oppose.
  If the ordinance PROTECTS me or my family, my judgment is "good rule".
  Values shape the degree: traditional residents are stricter on curfews and discipline, progressive residents care more about personal freedom; but everyone respects human dignity and the Constitution.
comply: "comply" = follow it fully; "partial" = only when enforcers are watching; "evade" = find a way around it.
  For fair rules, if impact is 1 or 2, I comply fully unless I distrust officials. Many who dislike a rule still comply out of fear of the penalty.
  For a rule that is wrong, I would not help enforce it; people targeted by it would evade it.
quote: ONE Taglish sentence (Tagalog mixed with English, max 15 words), what I would tell a neighbor, in my voice.
  If it touches me, say how, naming the specific thing (my cigarettes, my bags, my anak, my parking).
  If it does not touch me, do NOT say I am unaffected and do NOT say "we must follow it for the barangay"; speak from my angle instead, concretely.
  If the rule is wrong, say WHY in plain words (e.g. it punishes people for who they are, it is against the Constitution, the penalty is too harsh).
  Only mention things in MY profile; never invent a job, vehicle, habit, or family I do not have.
  ${RESPECT} No hashtags, no emojis, no quotation marks. Do not start with "Grabe" or "Naku".
Example quotes from different residents (tone only, never copy):
- "Okay lang sa akin 'yan, hindi naman ako naninigarilyo."
- "Isang kaha isang araw ako, saan na ako yoyosi ngayon?"
- "Mabuti 'yan, para hindi na gabi-gabing gumagala anak ko."
- "Opo, susunod po kami, pero sana may libreng eco-bag muna sa palengke."
- "Hindi krimen ang pagkatao ng tao, labag 'yan sa Konstitusyon."
Answer only in the JSON schema.`

// Contradiction checker: fixes blatant stance/judgment mismatches the model sometimes makes
// (calling something a good rule while opposing it at no personal cost, or supporting an unjust rule).
export function reconcile(r) {
  if (!r || !r.judgment) return r
  let stance = r.stance
  if (r.judgment === 'unfair or harmful') stance = 'oppose'
  else if (r.judgment === 'good rule' && r.stance === 'oppose' && r.impact <= 2) stance = 'support'
  else if (r.judgment === 'good rule but costly for me' && r.stance === 'support' && r.impact >= 4) stance = 'mixed'
  else if (r.judgment === 'good rule but costly for me' && r.impact <= 2 && r.stance === 'mixed') stance = 'support'  // impact 1-2 is not costly
  return stance === r.stance ? r : { ...r, stance, adjusted: true }
}

// Finds contradictions worth one re-ask. Returns a short reason, or '' if the answer is consistent.
// Checks: "not really" with high impact, a protected resident opposing a lawful rule, claiming a
// habit/job the resident doesn't have, and a quote whose tone contradicts the stance.
const NEGATED = /(hindi|di|wala|never|not|don't|do not)\b[^.,!?]{0,18}$/i
function mentions(text, pattern) {
  for (const m of text.matchAll(new RegExp(pattern.source, 'gi'))) {
    if (!NEGATED.test(text.slice(0, m.index))) return true   // "hindi ako naninigarilyo" is fine
  }
  return false
}
const HABIT_CLAIMS = [
  [/sigarilyo|yosi|manigarilyo|naninigarilyo|mag-?smoke|my cigarette/, /smokes/, 'you do not smoke'],
  [/\bvape\b|\bvaping\b|mag-?vape/, /vapes/, 'you do not vape'],
  [/kotse ko|sasakyan ko|my car|parking ko/, /owns a car|drives a private car/, 'you do not own a car'],
  [/pasada ko|boundary ko|tricycle ko|jeep ko|my tricycle|my jeepney/, /drives a (tricycle|jeepney)/, 'you do not drive a tricycle or jeepney for work'],
  [/tindahan ko|paninda ko|stall ko|pwesto ko|my store|my stall/, /plastic bags|carinderia/, 'you do not own a store or stall']
]
const SUPPORT_TONE = /\b(tama (lang )?'?yan|maganda '?yan|buti nga|go ako|suportado|sang-ayon ako|dapat lang)\b/i
const OPPOSE_TONE = /\b(hindi ako papayag|ayoko|labag|mali '?yan|hindi tama|tutol ako)\b/i

export function findContradiction(r, persona, brief = '') {
  if (!r || r.error) return ''
  if (r.touches_me === 'not really' && r.impact >= 4) return 'you said it does not really touch you, yet rated impact ' + r.impact
  const lawful = /ordinary, lawful regulation/.test(brief)
  const { protects } = relevantDetails(persona.details, brief, persona.job)
  if (lawful && protects.length && r.stance === 'oppose') return `this ordinance protects you (${protects[0]}), yet you oppose it`
  const said = `${r.quote} ${r.effect}`
  for (const [claim, has, fact] of HABIT_CLAIMS) {
    if (mentions(said, claim) && !(persona.details || []).some(d => has.test(d)) && !(has.source.includes('plastic') && /vendor|sari-sari|store/.test(persona.job))) {
      return `you talked as if you have this, but ${fact}`
    }
  }
  if (!/\bpero\b|\bbut\b/i.test(r.quote)) {
    if (r.stance === 'oppose' && SUPPORT_TONE.test(r.quote)) return 'your quote sounds supportive but your stance is oppose'
    if (r.stance === 'support' && OPPOSE_TONE.test(r.quote)) return 'your quote sounds opposed but your stance is support'
  }
  return ''
}

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
  [/LGBTQ/, /sogiesc|sexual orientation|gender|discriminat|lgbt|gay|lesbian|bakla|tomboy|transgender|homosexual|queer/, 'I am not LGBTQ+'],
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
stance: support, mixed, or oppose. Think like a decent, informed person: read the "Legal and ethical check". If the rule punishes people for who they are, jails people for harmless acts, or is likely unconstitutional, oppose it even if it does not touch me. Support rules that genuinely protect health, safety, or children. If the ordinance PROTECTS me or my family, support it. If it cuts my income, weigh that honestly.
comply: "comply" = follow fully; "partial" = only when watched; "evade" = find a way around it.
reaction: max 30 words of natural Taglish (Tagalog mixed with English), what I would say at a barangay assembly. Make one clear point. If you are told what neighbors said, respond to one specific concern of theirs (agree or push back) from your own experience. Do not start with "Uy" or "Ay naku". No hashtags, no emojis.
loophole: English, max 30 words. The most realistic way people would get around THIS ordinance, or a specific gap in its wording. Name the exact word, section, or missing detail.
what_would_help: English, max 30 words. One concrete change to the ordinance or its rollout that would make it work better for people like me.
${RESPECT}
Answer only in the JSON schema.`

export const LOOPHOLE_SYSTEM_EXTRA = `
You are especially sharp about wording: quote the exact vague word or missing definition, and name who could exploit it.`

export function panelUser(p, ordinance, brief, neighbors = '') {
  const facts = factLines(relevantDetails(p.details, `${brief || ''}\n${ordinance}`, p.role), 'This ordinance restricts nothing I personally do.')
  return `You are ${p.name}, ${p.role}. ${p.bio}
${facts}${neighbors ? `\n${neighbors}` : ''}
Ordinance (text):
${ordinance}
${brief ? `\nIn plain words:\n${brief}` : ''}`
}

// ---------- Report ----------

export const REPORT_SYSTEM = `You are a legislative analyst helping a Quezon City councilor improve an ordinance.
You get results from a SIMULATION of residents (not a real survey): stance counts, counts by occupation, compliance, a panel of detailed residents with their loopholes and suggested fixes, and sample quotes.
Write clear, specific English for the councilor. Refer to sections of the ordinance. Build amendments from the panel's suggested fixes and loopholes.
If the ordinance leaves key details unstated (penalties, definitions, exemptions, enforcement), say so and propose explicit wording.
Read the "Legal and ethical check". If the ordinance is likely unconstitutional or punishes people for who they are, the headline must say so plainly, and the first amendment must recommend withdrawing it or replacing it with a lawful alternative; do not polish an unjust rule. Cite only the facts given.
Keep every field short: headline max 25 words, each list item max 18 words, each amendment field max 30 words.
analysis: think first, max 50 words, private notes: the 2 biggest problems, who carries the burden (use the Fairness line), and which existing sections to change.
headline: one sentence summarizing how residents react; it must match the Overall line.
most_affected: up to 4 items, formatted as "<group>: <the concrete harm THIS ordinance causes them>, avg impact <number from the data>".
top_loopholes: up to 4 items, the most realistic ways the ordinance would be evaded or misread.
amendments: up to 3. clause = an EXISTING section number from the ordinance, or "New section" if adding one; change = the exact new or added wording, ready to paste; reason = which group or loophole it fixes.
Answer only in the JSON schema.`

// Used instead of REPORT_SYSTEM when the brief finds the ordinance targets identity or is likely
// unconstitutional. A small model asked to "improve" such a draft will happily help enforce it
// (it once proposed how to identify LGBTQ+ people), so this is decided in code, not by the model.
export const REPORT_UNLAWFUL_SYSTEM = `You are a legislative analyst advising a Philippine city councilor.
This draft ordinance FAILED the legal and ethical check: it likely violates the Constitution and/or punishes people for who they are.
Your job is NOT to improve, clarify, or enforce it. Never propose definitions, ways to identify people, penalties, or enforcement for what it targets.
You also get results from a SIMULATION of residents (not a real survey).
Keep every field short: headline max 25 words, each list item max 20 words, each amendment field max 30 words.
analysis: think first, max 40 words, private notes: the main legal problem and who is harmed.
headline: say plainly that the draft is likely unconstitutional or discriminatory and should not be passed; mention how residents reacted.
most_affected: up to 4 items, "<group>: <how this draft harms them>" (the people targeted, their families, enforcers exposed to lawsuits, the city).
top_loopholes: up to 4 items, but list LEGAL PROBLEMS instead: the specific rights or laws it violates, citing only the facts given.
amendments: up to 3. The first must be: clause "Entire ordinance", change "Withdraw this draft; do not pass it.", reason = the main legal problem. Then up to 2 lawful alternatives that address any legitimate concern without targeting anyone's identity (for example, an ordinance against harassment or discrimination consistent with the Safe Spaces Act).
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

// ---------- Fairness lens (code only, no model) ----------
// Does the burden fall hardest on low earners? Earners use their own income, others their household's.
const BRACKETS = ['below ₱10k', '₱10–25k', '₱25–50k', 'above ₱50k']
const bracketOf = income => BRACKETS.find(b => income.includes(b)) || 'unknown'

export function fairnessLens(personas, results) {
  const acc = Object.fromEntries(BRACKETS.map(b => [b, { n: 0, impact: 0, oppose: 0 }]))
  results.forEach((r, i) => {
    const b = r && !r.error && personas[i] ? acc[bracketOf(personas[i].income)] : null
    if (!b) return
    b.n++; b.impact += r.impact; if (r.stance === 'oppose') b.oppose++
  })
  const byIncome = BRACKETS.map(bracket => {
    const { n, impact, oppose } = acc[bracket]
    return { bracket, n, avgImpact: n ? +(impact / n).toFixed(1) : null, opposeShare: n ? Math.round(oppose / n * 100) : null }
  })
  // Compare the lowest bracket with everyone earning ₱25k+.
  const low = acc['below ₱10k']
  const hi = ['₱25–50k', 'above ₱50k'].reduce((m, b) => ({ n: m.n + acc[b].n, impact: m.impact + acc[b].impact, oppose: m.oppose + acc[b].oppose }), { n: 0, impact: 0, oppose: 0 })
  let flag = null
  if (low.n >= 3 && hi.n >= 3) {
    const lo = low.impact / low.n, h = hi.impact / hi.n
    const pct = x => Math.round(x.oppose / x.n * 100)
    if (lo - h >= 0.4) flag = `Burden falls hardest on households below ₱10k: avg impact ${lo.toFixed(1)} vs ${h.toFixed(1)} for ₱25k and up (${pct(low)}% vs ${pct(hi)}% oppose).`
    else if (h - lo >= 0.4) flag = `Burden falls more on households earning ₱25k and up: avg impact ${h.toFixed(1)} vs ${lo.toFixed(1)} below ₱10k.`
  }
  return { byIncome, flag }
}

// ---------- Panel: what the neighbors said ----------
// Compact digest of the finished crowd so panelists react to real concerns, not a vacuum.
export function neighborsDigest(personas, results) {
  const ok = results.map((r, i) => (r && !r.error ? { r, p: personas[i] } : null)).filter(Boolean)
  if (ok.length < 10) return ''
  const pct = s => Math.round(ok.filter(x => x.r.stance === s).length / ok.length * 100)
  const groups = {}
  for (const { r, p } of ok) {
    const g = (groups[p.group || p.job] ??= { n: 0, impact: 0, oppose: 0 })
    g.n++; g.impact += r.impact; if (r.stance === 'oppose') g.oppose++
  }
  const hardest = Object.entries(groups).filter(([, g]) => g.n >= 2)
    .sort((a, b) => b[1].impact / b[1].n - a[1].impact / a[1].n).slice(0, 2)
    .map(([k, g]) => `${k} (${g.oppose} of ${g.n} oppose, avg impact ${(g.impact / g.n).toFixed(1)})`)
  const voices = ok.filter(x => x.r.touches_me !== 'not really' || x.r.stance === 'oppose')
    .sort((a, b) => b.r.impact - a.r.impact).slice(0, 3)
    .map(x => `${x.p.job}: "${x.r.quote}"`)
  return `What your neighbors said (simulated): ${pct('support')}% support, ${pct('mixed')}% mixed, ${pct('oppose')}% oppose of ${ok.length}.
Hardest hit: ${hardest.join('; ') || 'no clear group'}.
Voices: ${voices.join(' | ')}`
}

// ---------- Report: amendments must point at real sections ----------
// Returns the clauses that cite a Section number the ordinance doesn't have ([] if all fine,
// or if the ordinance has no numbered sections to check against).
export function missingSections(ordinance, amendments = []) {
  const have = new Set([...ordinance.matchAll(/Section\s+(\d+)/gi)].map(m => m[1]))
  if (!have.size) return []
  return amendments.map(a => a.clause || '').filter(c => {
    if (/new section|add(ed)? (a )?section|entire ordinance|whole ordinance|withdraw|alternative/i.test(c)) return false
    const cited = [...c.matchAll(/Section\s+(\d+)/gi)].map(m => m[1])
    return cited.some(n => !have.has(n))
  })
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

// The brief's legal and ethical check, compact enough for the report's 2048-token context.
export function legalCheckText(b) {
  if (!b) return ''
  return `Legal and ethical check:
- Punishes people for who they are: ${b.targets_identity ? 'YES' : 'no'}
- Rights and laws: ${b.rights_issues}
- Penalty: ${b.penalty_check}
- Legality: ${b.legality}${b.known_facts?.length ? `\nRelevant facts:\n${b.known_facts.slice(0, 2).map(f => '- ' + clip(f, 220)).join('\n')}` : ''}`
}

// States the actual majority so the headline can't contradict the numbers (it once said "Residents Oppose" at 55% support).
function overallLine({ stance, total }) {
  if (!total) return 'no responses'
  const [top, n] = Object.entries(stance).sort((a, b) => b[1] - a[1])[0]
  const pct = Math.round(n / total * 100)
  return pct > 50 ? `most residents ${top.toUpperCase()} (${pct}%)` : `no majority; largest group ${top} (${pct}%)`
}

export function reportUser(ordinance, summary, panelAnswers, legalCheck = '', fairnessFlag = '') {
  const jobs = groupLines(summary.byJob, 5)
  const details = groupLines(summary.byDetail, 4, 3)
  const panel = panelAnswers
    .filter(a => a.answer)
    .map(a => `- ${a.name}, ${a.role} (${a.answer.stance}, impact ${a.answer.impact}). Loophole: ${clip(a.answer.loophole, 100)} Fix: ${clip(a.answer.what_would_help, 100)}`)
    .join('\n')
  return `Ordinance:
${ordinance}
${legalCheck ? `\n${legalCheck}\n` : ''}
Simulated crowd: ${summary.total} residents
Stance: ${summary.stance.support} support, ${summary.stance.mixed} mixed, ${summary.stance.oppose} oppose
Overall: ${overallLine(summary)}
Compliance: ${summary.comply.comply} comply, ${summary.comply.partial} partial, ${summary.comply.evade} evade
Touched: ${summary.touches.directly} directly, ${summary.touches.indirectly} indirectly, ${summary.touches['not really']} not really
Fairness: ${fairnessFlag || 'no strong income pattern'}
Most affected occupation groups:
${jobs}
Most affected by life situation:
${details}

Panel:
${panel}

Sample quotes:
${summary.quotes.slice(0, 2).map(q => '- ' + q).join('\n')}`
}
