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
still_allowed: max 20 words. What people may still do that a careless reader might think is banned (e.g. a ban on handing out plastic bags does not make shoppers buy plastic bags; they bring reusable bags). Give exact hours if the rule only applies at certain times. "not stated" if nothing.
where_when: max 20 words. penalty: max 20 words. exemptions: max 25 words.
targets_identity: true if it punishes or restricts people for WHO THEY ARE (sexual orientation, gender identity, religion, ethnicity, disability, poverty) rather than for a harmful ACT.
rights_issues: max 30 words. Which constitutional rights or national laws it may violate, using the facts below. "None apparent" if it is an ordinary regulation.
penalty_check: max 25 words. Is the penalty within what a city may impose (max ₱5,000 fine and/or 1 year jail) and proportionate to the harm? "Not stated" if no penalty is given.
public_benefit: max 20 words. The real benefit to the community, if any (health, safety, cleanliness). "None" if it only harms people.
legality: "likely valid" for ordinary regulations of harmful acts with fair penalties; "questionable" if vague, overbroad, or the penalty seems excessive; "likely unconstitutional" if it targets identity, punishes harmless conduct, exceeds penalty limits, or violates the Bill of Rights.
known_facts: up to 3 facts from the list below that are relevant to this ordinance, copied closely. Never invent laws, cases, or numbers. Empty if none apply.
issues: 4 or 5 different open questions a councilor must settle before this works, each max 15 words, naming the section or exact word when possible. Cover different kinds: a vague word or missing definition, who carries the cost, a group that needs an exemption or transition time, how it is enforced (and the risk of abuse), and a part of the ordinance people overlook. Specific to THIS text.
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
  // The brief once wrote "shoppers can continue to purchase brown paper bags", which planted a bag-fee
  // reading in half the crowd. Anything about buying or paying is dropped.
  if (/\b(buy|purchase|pay for)\b/i.test(brief.still_allowed || '')) brief = { ...brief, still_allowed: 'not stated' }
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
What changes: ${b.what_changes}${b.still_allowed && !/^not stated/i.test(b.still_allowed) ? `\nStill allowed: ${b.still_allowed}` : ''}
Where/when: ${b.where_when}
Penalty: ${b.penalty}
Exemptions: ${b.exemptions}`
  if (b.legality === 'likely valid' && !b.targets_identity) {
    // "Real benefit: None" on a lawful rule (the model's slip) made residents call it pointless.
    const benefit = /^\s*(none|not stated|n\/a)\b/i.test(b.public_benefit || '') ? '' : ` Real benefit: ${b.public_benefit}`
    return `${head}\nLegal and ethical check: an ordinary, lawful regulation.${benefit}`
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
STAY ON TOPIC: only talk about things this ordinance actually changes. You are told whether your WORK is affected.
  If my work is NOT affected, never mention my job, my cooking, my shift, my farm, my stall, or my route; react as a resident, parent, neighbor, consumer, or citizen.
insight (only when the schema asks for it): one plain English sentence, max 20 words: who is affected, what goes wrong with THIS rule for them, and one concrete fix.
  Work from the "Insight angle" you are given and from my own situation; name the section or exact word when you can.
  Never a generic wish any resident could say ("explain it well", "enforce it fairly", "it is good for everyone").
FAMILY: only mention family members listed under "Home". Never give relatives names. If I live alone or have no children, never talk about my anak or apo.
quote: ONE Taglish sentence (Tagalog mixed with English, max 15 words), what I would tell a neighbor, in my voice, on the same point as my insight or effect. Begin with the opener you are given.
  If it touches me, say how, naming the specific thing it restricts in my life.
  If it does not touch me, do NOT say I am unaffected and do NOT say "we must follow it for the barangay"; speak from my angle instead, concretely.
  If the rule is wrong, say WHY in plain words (e.g. it punishes people for who they are, it is against the Constitution, the penalty is too harsh).
  Only mention things in MY profile; never invent a job, vehicle, habit, or family I do not have.
  ${RESPECT} No hashtags, no emojis, no quotation marks.
Answer only in the JSON schema.`

// Stance-neutral quote openers, rotated by resident. Example quotes in the prompt were copied word
// for word ("wala naman kaming videoke" under a curfew), and without them 60% of quotes opened with
// "Ayos lang sa akin 'yan"; a given opener keeps 200 voices varied for free.
// (No worry-leaning openers: "Ang inaalala ko" pushed supporters into worried quotes.)
const OPENERS = ['Para sa akin,', 'Kung ako ang tatanungin,', 'Sa totoo lang,', 'Sa ganang akin,', 'Kung ako lang,',
  'Dito sa amin,', 'Basta ako,', 'Alam mo,', 'Kung tutuusin,', 'Ang mahalaga,', 'Sa nakikita ko,', 'Simple lang,']

// Last-resort label fixer, applied after the one re-ask. The quote is written after the stance,
// so it fixes the judgment/comply labels where it can and only flips a stance for unjust rules.
// lawful: the brief found an ordinary, lawful regulation (smokers called a littering ban "unfair or harmful").
const CONCERN = /nakakabahala|kotong|lumala|magkagulo|sayang lang|walang silbi|hindi maganda|^baka\b|problema|nagpapahirap|mahihirapan|hassle|hindi patas|magulo/i
export function reconcile(r, lawful = false) {
  if (!r || !r.judgment) return r
  let { stance, judgment, comply } = r
  if (judgment === 'good rule but costly for me' && r.impact <= 2) judgment = 'good rule'   // impact 1-2 names no real cost
  if (lawful && judgment === 'unfair or harmful') { judgment = r.impact >= 3 ? 'good rule but costly for me' : 'pointless'; stance = stance === 'support' ? 'mixed' : stance }
  // Only residents with a real stake; "walang problema" is negated, not a concern.
  if (stance === 'support' && r.impact >= 3 && mentions(r.quote || '', CONCERN) && !/\bpero\b|\bbut\b/i.test(r.quote || '')) stance = 'mixed'
  if (judgment === 'unfair or harmful') stance = 'oppose'
  else if (judgment === 'good rule' && stance === 'oppose' && r.impact <= 2) judgment = 'pointless'
  else if (judgment === 'good rule but costly for me' && stance === 'support' && r.impact >= 4) stance = 'mixed'
  if (r.touches_me === 'not really' && comply === 'partial' && judgment !== 'unfair or harmful') comply = 'comply'
  const same = stance === r.stance && judgment === r.judgment && comply === r.comply
  return same ? r : { ...r, stance, judgment, comply, adjusted: true }
}

// Cleans a field the schema cap cut short: back to the last clause break if it is near the end,
// otherwise drop the half word and any dangling connector, then mark the cut with "…".
const DANGLING = /\s+(and|or|the|to|of|a|for|with|ng|sa|na|at|para|pero|kasi|ang|mga|kung)$/i
export function tidyEnd(s = '', max = 999) {
  s = (s || '').trim()
  if (s.length < max - 3) return s
  const brk = Math.max(...['.', '!', '?', ',', ';'].map(c => s.lastIndexOf(c)))
  if (brk > s.length * 0.6) return /[.!?]/.test(s[brk]) ? s.slice(0, brk + 1) : s.slice(0, brk) + '…'
  let t = s.replace(/\s+\S*$/, '')
  while (DANGLING.test(t)) t = t.replace(DANGLING, '')
  return t + '…'
}

// Finds contradictions worth one re-ask. Returns a short reason, or '' if the answer is consistent.
// Checks: "not really" with high impact, a protected resident opposing a lawful rule, claiming a
// habit/job the resident doesn't have, and a quote whose tone contradicts the stance.
const NEGATED = /(hindi|di|wala|walang|wala nang|never|not|don't|do not)\b[^.,!?]{0,18}$/i
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
const SUPPORT_TONE = /\b(tama (lang )?'?yan|maganda '?yan|buti nga|go ako|suportado|sang-ayon ako|dapat lang|sooner|long overdue|matagal na (sana|dapat))\b/i
const OPPOSE_TONE = /\b(hindi ako papayag|ayoko|labag|mali '?yan|hindi tama|tutol ako|hindi (naman )?(siya|sila) kriminal)\b/i

// Only English/Tagalog letters and normal punctuation ("bớ" and stray Korean slipped through).
const ODD_CHARS = /[^\x09\x0A\x0D\x20-\x7EÀ-ſ–—‘-”…₱]/
// Misreadings the judges saw repeatedly: [ordinance pattern, answer pattern, correction, groups exempt].
// Answers are checked after curly apostrophes become straight ones (90 of 120 answers used ’).
const MISREADS = [
  [/plastic bags?/i, /buy (my |our )?(own )?plastic|pay (for )?(every|each|the) (plastic )?bags?|charge .{0,12}bags?|bumili ng plastic/i,
    'the ordinance bans handing out plastic bags; nobody buys or pays for them. The change is reusable or paper bags'],
  // Sellers buying paper bags to hand out read it correctly; shoppers do not have to buy bags.
  [/plastic bags?/i, /\b(buy|pay (extra )?for|purchase|bumili ng|bibili ng)\b.{0,25}\bbags?\b|gives? me a plastic bag/i,
    'stores just stop handing out plastic bags; shoppers bring a reusable bag. Nothing makes you buy bags', ['vendor / store worker', 'food service worker']],
  [/discipline hours|curfew/i, /(can't|cannot|won't|no more|hindi na|bawal)\b.{0,50}\b(evening mass|mass|misa|part(y|ies)|graduation)\b/i,
    'Section 3 EXEMPTS minors going to or from parties, graduations, masses and school activities'],
  [/discipline hours|curfew/i, /\bI('ll| will)? (have to|must) (be home|stay (home|inside))\b|no more hanging out with my friends/i,
    'the curfew covers only minors under 18; it does not restrict you as an adult'],
  [/litter|rubbish/i, /(can't|cannot|not to|bawal|no longer) .{0,30}\b(in|into|sa) (the )?(trash )?(bins?|basurahan)|even in the bins?/i,
    'the ordinance bans littering in public places; putting trash in bins is what it wants'],
  [/litter|rubbish/i, /(stop|can'?t|cannot|not to|no longer|bawal|another way to)\s.{0,20}(giv\w*|hand\w*) out\b.{0,25}(bags|goods)|bags?\b.{0,30}(seen as|count as|are now) litter/i,
    'it bans dropping trash or spitting in public; handing out bags or goods is not affected'],
  [/reserv\w*.{0,40}park/i, /(can'?t|cannot|stop|no (more|longer)|bawal) .{0,20}park(ing)?\b|(can'?t|cannot) just pull up|find (somewhere|another place) (else )?to park|can'?t leave my car|hindi na (pwede|puwede)(ng)? (mag-?)?park|park(ing)? .{0,30}hindi na (pwede|puwede)|park wherever|sidewalk|can (now )?put (up )?cones/i,
    'only reserving the curb (cones, chairs, signs) is banned; parking, stopping and unloading on the street are unchanged'],
  [/plastic bags?/i, /(bring\w*|magdala)\b.{0,30}\bbags?\b.{0,40}(deliver|order|online)|(deliver\w*|order\w*)\b.{0,40}(bring\w*|magdala)\b.{0,20}\bbags?\b|ask (for|them for) (a |paper )?bags?/i,
    'stores stop handing out plastic bags; delivery and takeout still come packed by the store, you never bring a bag to a delivery'],
  [/reserv\w*.{0,40}park/i, /\bjeep(ney)?s?\b|\btricycles?\b|traffic (will )?(flow|be smoother)|madali ang pagdaan|mas maluwag ang (daan|kalsada)|walang sasakyan sa (kalye|kalsada)|no cars on the street|ticket.{0,25}park/i,
    'it only stops households saving the curb in front of their house (cones, chairs, signs) on residential side streets; jeepneys, tricycles and traffic are not the point', ['driver']],
  [/litter|rubbish|spit/i, /(watch|bantay)\w*.{0,40}(drag|smok|yosi|sigarilyo)|(ban|limit|restrict)\w*.{0,15}smok|target\w*.{0,25}smokers|not to smoke|can'?t smoke|stop smoking|no more smoking|bawal (na )?(mag-?)?(yosi|manigarilyo)/i,
    'smoking is still allowed; only dropping cigarette butts or spitting in public is banned']
]
const TIME_WINDOW = /\d{1,2}(?::\d\d)?\s*[AP]\.?M\.?\s*(?:to|until|-|–)\s*\d{1,2}(?::\d\d)?\s*[AP]\.?M\.?/i
// Any clock time in the answer that falls outside the ordinance's window (the resident's own work
// hours are fine to mention). Handles windows that cross midnight, like 10 PM-5 AM.
const to24 = (h, ap) => (+h % 12) + (/p/i.test(ap) ? 12 : 0)
function outsideWindow(win, said, schedule = '') {
  const [a, b] = [...win.matchAll(/(\d{1,2})(?::\d\d)?\s*([AP])\.?M/gi)].map(m => to24(m[1], m[2]))
  if (a === undefined || b === undefined) return false
  return [...said.matchAll(/\b(\d{1,2})(?::\d\d)?\s*([AP])\.?M\b/gi)].some(m => {
    const near = said.slice(Math.max(0, m.index - 40), m.index + 20)
    if (schedule.includes(`${m[1]} ${m[2].toUpperCase()}M`) && /fish|work|shift|driv|leave|alis|trabaho|pasada|biyahe|deliver|market/i.test(near)) return false
    const t = to24(m[1], m[2])
    return a > b ? (t > b && t < a) : (t < a || t > b)
  })
}
const WRONG_HOURS =/after (school|class(es)?|dinner|5|6)\b|pagkatapos ng (eskwela|klase|school)|until [1-8] ?PM|past [1-8] ?PM/i
// Invented relatives (childless residents claimed kids, most named "Ben").
const KIN = /\b(anak ko|mga anak ko|apo ko|pamangkin ko|pinsan ko|my (younger |little )?(anak|son|daughter|kids?|children|grand(son|daughter|child|children|kids?)|apo|nephew|niece|cousins?))\b/i
const NAMED_KIN = /\b(son|daughter|grandson|granddaughter|anak|apo|cousin|pinsan)\b,?\s+(si\s+)?[A-Z][a-z]+/
// Words that mean "I am talking about my job", per occupation group.
const JOB_WORDS = {
  'vendor / store worker': /palengke|tindahan|paninda|\bbenta\b|customers?|suki|\bstall|pwesto|\bmarket\b/i,
  driver: /pasada|pasahero|passengers?|boundary|terminal|biyahe|\bruta\b/i,
  farmer: /bukid|\bfarm|palay|harvest|\bani\b/i,
  fisherfolk: /\bcatch\b|bangka|laot|pangingisda/i,
  'food service worker': /pagluluto|nagluluto|kusina|my shift|carinderia/i,
  'construction worker': /construction|site ko|\bobra\b/i
}
// Speaking for another sector the ordinance doesn't touch ("sana isipin ang mga tricycle driver").
// Not checked for vehicle/parking rules, where talking about motorists IS the topic.
const OTHER_SECTORS = [
  [/jeepney drivers?|tricycle drivers?/i, 'driver'],
  [/\bvendors\b|tindera|nagtitinda/i, 'vendor / store worker'],
  [/farm workers|farmers|magsasaka/i, 'farmer']
]

// Returns the first problem found (one re-ask per resident), or '' if the answer is consistent.
// Order: broken text, misreading the rule, invented facts, off-topic job talk, label clashes, tone.
export function findContradiction(r, persona, brief = '', affected = null, ordinanceText = '') {
  if (!r || r.error) return ''
  const raw = `${r.effect || ''} ${r.insight || ''} ${r.quote || ''}`
  if (ODD_CHARS.test(raw)) return 'use only English and Tagalog letters'
  const said = raw.replace(/[‘’]/g, "'")
  for (const [rule, misread, fix, skip = []] of MISREADS) {
    if (rule.test(ordinanceText) && misread.test(said) && !skip.includes(persona.group)) return `you misread the ordinance: ${fix}`
  }
  if (/Penalty: (not stated|as provided)/i.test(brief) && /(fines?|multa|penalt(y|ies))\b.{0,25}(harsh|high|mahal|malaki|mabigat)|₱\s?\d/i.test(said)) {
    return 'the penalty amount is not stated; do not describe a fine or how harsh it is'
  }
  const win = ordinanceText.match(TIME_WINDOW)
  if (win && (WRONG_HOURS.test(said) || outsideWindow(win[0], said, persona.schedule))) return `the ordinance only covers ${win[0].trim()}, not other hours`
  if (r.touches_me === 'not really' && r.impact >= 4) return 'you said it does not really touch you, yet rated impact ' + r.impact
  // Who is affected comes from the ordinance text only: model-written brief words ("reduced litter",
  // "traffic flow") marked 10 residents as directly affected when they were not.
  const topic = ordinanceText || brief
  const lawful = /ordinary, lawful regulation/.test(brief)
  const rel = relevantDetails(persona.details, topic, persona.job, persona)
  if (lawful && rel.protects.length && r.stance === 'oppose') return `this ordinance protects you (${rel.protects[0]}), yet you oppose it`
  const details = persona.details || []
  const hasKids = details.some(d => /teenager|young kids|minor/.test(d))
  if (!hasKids && (mentions(said, KIN) || NAMED_KIN.test(said))) return 'you have no children or grandchildren at home; do not invent relatives'
  for (const [claim, has, fact] of HABIT_CLAIMS) {
    if (mentions(said, claim) && !details.some(d => has.test(d)) && !(has.source.includes('plastic') && /vendor|sari-sari|store/.test(persona.job))) {
      return `you talked as if you have this, but ${fact}`
    }
  }
  if (/naglalakad lang ako|wala akong sasakyan|hindi ako nagmamaneho|i don'?t (own a car|drive)/i.test(said) && details.some(d => /owns a car|drives a/.test(d))) {
    return 'you own or drive a vehicle; do not say you walk or have none'
  }
  const work = workAffected(persona, affected)
  if (work === false && !rel.yes.length && JOB_WORDS[persona.group] && mentions(said, JOB_WORDS[persona.group])) {
    return 'your work is not affected by this ordinance; leave your job out and react as a resident'
  }
  if (Array.isArray(affected)) {
    for (const [re, g] of OTHER_SECTORS) {
      if (g === 'driver' && /vehicle|motor|\bpark/i.test(ordinanceText)) continue
      if (g !== persona.group && !affected.includes(g) && re.test(said)) return `this ordinance does not affect the work of the ${g} group; speak only about your own life`
    }
  }
  if ((rel.yes.length || work === true) && r.touches_me === 'not really') {
    return `this ordinance touches ${rel.yes[0] || 'your work as a ' + persona.job}; say how it changes your week`
  }
  if (r.judgment === 'unfair or harmful' && r.stance !== 'oppose') return `you judged it unfair or harmful, yet your stance is ${r.stance}`
  if (r.judgment === 'good rule' && r.stance === 'oppose' && r.impact <= 2) return 'you called it a good rule that costs you little, yet you oppose it'
  if (!/\bpero\b|\bbut\b/i.test(r.quote)) {
    if (r.stance === 'oppose' && SUPPORT_TONE.test(r.quote)) return 'your quote sounds supportive but your stance is oppose'
    if (r.stance === 'support' && OPPOSE_TONE.test(r.quote)) return 'your quote sounds opposed but your stance is support'
  }
  return ''
}

// Small models open most Filipino sentences with an interjection ("Ay,", "Uy,", "Naku,").
// Strip one leading interjection and stray quote marks so the grid shows varied, clean quotes.
const INTERJECTION = /^(ay naku|ay nako|naku|nako|ay|uy|hay|hay naku|grabe|ano ba|aba|hala|eh|sayang naman)\b[\s,!.…'’]*/i
// The opener we hand each resident steers the quote's angle, then is removed so 200 quotes don't
// all start with a stock phrase; a tag-on "di ba?" (in 40 of 120 quotes) goes too.
const OPENER_RE = new RegExp('^(' + OPENERS.map(o => o.replace(/,$/, '')).join('|') + '),?\\s*', 'i')
export function cleanQuote(q = '') {
  let s = q.trim().replace(/^["'‘’“”\s]+|["'‘’“”\s,]+$/g, '').replace(/["“”]\s*,?\s*["“”]?.*$/, '').trim()
  const noOpener = s.replace(OPENER_RE, '').replace(/^(['‘’]?di ?ba\??|po)[,!?\s]+/i, '').replace(/[,\s]*['‘’]?di ?ba\??\s*[.!?]?$/i, '').trim()
  if (noOpener.split(/\s+/).length >= 4) s = noOpener
  const stripped = s.replace(INTERJECTION, '')
  if (stripped.length > 12) s = stripped
  s = s.replace(/^(hin|['‘’]?di ba\??)\b[,.!?\s]*/i, '').replace(/[,\s]+hin\.?$/i, '')
  s = s.charAt(0).toUpperCase() + s.slice(1)
  return s && !/[.!?…]$/.test(s) ? s + '.' : s
}

// Which life details an ordinance can touch. A small model treats every detail it sees
// as relevant (a drinker thinks a smoking ban bans drinking), so residents only see the
// details whose topic actually appears in the ordinance.
// [detail pattern, ordinance topic pattern, what to say when the resident does NOT have it].
// The negative facts matter as much as the positive ones: told nothing, a small model
// assumes a resident reacting to a smoking ban must be a smoker.
// A negation may be a function of the resident's details (a parent of young kids is told the
// curfew misses their kids, not that they have no children).
const DETAIL_TOPICS = [
  [/minor \(under 18\)|teenager/, /minor|curfew|under 18|discipline hours|youth/,
    d => d.some(x => /young kids/.test(x)) ? 'my kids are young and home by night; I have no teenager' : 'I have no children under 18 at home'],
  [/smokes/, /smok|cigar|tobacco/, 'I do not smoke'],
  [/vapes/, /vap/, 'I do not vape'],
  // Not bare "school": the curfew's "school activities" exemption told parents of young kids the curfew burdened them.
  [/young kids in elementary/, /school zone|of (a |any )?schools?\b|near schools/, 'I have no young kids in school'],
  // \bpark: "SPARK v. Quezon City" in the curfew text matched bare "park".
  [/parks it on the street|drives a private car/, /\bpark(ing)?\b|\bcurb/,
    d => d.some(x => /garage/.test(x)) ? 'I park my car in my own garage, not on the street' : 'I do not park a car on the street'],
  [/drives a/, /traffic|idl|motorist|\bdrivers?\b|road closure|number coding/, 'I do not drive; I ride as a passenger or walk'],
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

// Links a small model misses on its own, spelled out as a sentence: smokers never connected a
// littering ban to their cigarette butts; night-shift parents never connected the curfew to their hours.
// [detail pattern, ordinance topic pattern, what it means for me].
const HOOKS = [
  [/smokes/, /litter|spit|rubbish/i, 'I smoke daily; my cigarette butts and spitting count as littering'],
  [/packs takeout|carinderia/, /litter|rubbish/i, 'the takeout containers we hand out often end up as street litter'],
  [/plastic bags/, /litter|rubbish/i, 'handing out plastic bags is still allowed; only bags or trash dropped on the street near my stall count as littering'],
  [/takeout|food delivery/, /plastic bag/i, 'my takeout and delivery orders will come in paper bags or none; I never have to bring a bag to a delivery'],
  [/teenager/, /parents?[\s\S]{0,200}penali/i, 'as the parent of a teenager who goes out at night, I can be penalized']
]
const NIGHT_WORK = /night|before dawn|late|\b[1-4] AM\b|until (9|10|11) PM/

// { yes: details this ordinance restricts or burdens, protects: details it protects,
//   no: facts about what I do NOT do }. person (optional) supplies the work schedule.
export function relevantDetails(details = [], ordinanceText = '', job = '', person = {}) {
  const text = ordinanceText.toLowerCase()
  const yes = [], no = [], protects = []
  for (const [detail, topic] of PROTECTS) {
    if (topic.test(text)) protects.push(...details.filter(d => detail.test(d)))
  }
  for (const [detail, topic, negation] of DETAIL_TOPICS) {
    if (!topic.test(text)) continue
    const mine = details.filter(d => detail.test(d) && !protects.includes(d))
    const neg = typeof negation === 'function' ? negation(details) : negation
    if (mine.length) yes.push(...mine)
    // Sellers who don't hand out bags still sell; skip the "I do not sell" line for them.
    else if (neg && !details.some(d => detail.test(d)) &&
      !(neg.startsWith('I do not sell') && /vendor|sari-sari|small business|store/i.test(job))) no.push(neg)
  }
  // Hooks go FIRST: the insight angle is built from yes[0], and the specific stake ("I work nights")
  // beats the generic detail ("has a teenager").
  const hooks = []
  for (const [detail, topic, line] of HOOKS) {
    if (topic.test(ordinanceText) && details.some(d => detail.test(d))) hooks.push(line)
  }
  if (/curfew|discipline hours/.test(text) && details.some(d => /teenager/.test(d)) && NIGHT_WORK.test(person.schedule || '')) {
    hooks.unshift(`my work hours (${person.schedule}) mean I am often not home to watch my teenager at night`)
  }
  return { yes: [...new Set([...hooks, ...yes])], hooks, no: [...new Set(no)], protects: [...new Set(protects)] }
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
// Which occupation groups' WORK an ordinance touches, decided in code from its text. The model was
// asked to pick these once and returned ["unemployed", "unemployed", "unemployed"] for a curfew.
const GROUP_TOPICS = [
  ['farmer', /\bfarm|agricultur|crop|pesticide|irrigation|harvest/i],
  ['fisherfolk', /fishing|fisherfolk|fishermen|fisherman|coastal|\bboats?\b/i],
  ['construction worker', /construction|building permit|demolition|scaffold/i],
  ['factory worker', /factor(y|ies)|industrial|manufactur/i],
  ['vendor / store worker', /plastic bag|\bbags?\b|vendor|\bstores?\b|retail|sari-sari|\bstalls?\b|\bmarkets?\b|\bsell(ing|ers?)?\b/i],
  // Not bare "enforc" or "vehicle"/"parking": "enforcement authority" in the parking rule told the
  // teacher and the tricycle driver their work was directly affected.
  ['government employee', /\btanod|public safety officer|DPOS|police|barangay (official|employee|staff)/i],
  ['driver', /tricycle|jeepney|public utility|\bPUVs?\b|\bdrivers?\b|motorist|traffic|idl(e|ing)|\btransport|terminal|loading zone/i],
  ['food service worker', /restaurant|cutlery|carinderia|disposable|single-use|eater(y|ies)|hotel|fast.food|food service/i],
  ['service worker', /salon|repair|kasambahay|household help/i],
  ['BPO / admin worker', /\bBPO\b|call cent|night shift/i],
  ['health worker / professional', /health cent|hospital|clinic|\bnurses?\b|medical/i]
]
const NO_WORK = new Set(['unemployed', 'student', 'homemaker', 'senior / retiree'])

export function affectedGroupsFor(text = '') {
  return GROUP_TOPICS.filter(([, re]) => re.test(text)).map(([g]) => g)
}

// true / false for workers; null for people without a job (no "my work" line at all).
export function workAffected(r, affectedGroups) {
  if (!Array.isArray(affectedGroups) || NO_WORK.has(r.group)) return null
  return affectedGroups.includes(r.group)
}

// Does this ordinance reach the resident's own life or work (burden or protection)? Only these
// residents write their own effect and an insight.
export function isTouched(r, topicText, affectedGroups) {
  const rel = relevantDetails(r.details, topicText, r.job, r)
  return rel.yes.length > 0 || rel.protects.length > 0 || workAffected(r, affectedGroups) === true
}

// Effect line written in code for residents the ordinance doesn't touch. The model's free-text effect
// was where most misreads and invented stakes appeared ("watch out near the plaza", grandchildren).
export function bystanderEffect(rel = { no: [] }, lawful = true) {
  if (!lawful) return 'It does not target me, but it targets people in my community.'
  return rel.no?.length ? `Not me directly: ${rel.no[0]}.` : 'Nothing in my own week changes.'
}

// Insight kinds, used when the brief has no issues list (spreads residents across kinds of points).
const INSIGHT_KINDS = [
  'a group like me that needs an exemption or transition time',
  'a practical problem I would hit following it',
  'a word or limit in the text that is unclear for my case',
  'a side effect on my money, time, or family',
  'what I would need first to be able to comply'
]

// Picks the brief issue closest to this resident's stake (word overlap); otherwise rotates by k,
// so affected residents spread across all the issues instead of repeating one.
export const words = s => new Set(String(s).toLowerCase().replace(/[^a-z0-9ñ\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w)))
export function pickIssue(r, issues = [], rel = { yes: [] }, k = 0) {
  if (!issues.length) return ''
  const mine = words(`${rel.yes.join(' ')} ${r.job} ${r.group}`)
  const scored = issues.map((iss, i) => ({ iss, i, s: [...words(iss)].filter(w => mine.has(w)).length }))
  const best = Math.max(...scored.map(x => x.s))
  const pool = best > 0 ? scored.filter(x => x.s === best) : scored
  return pool[k % pool.length].iss
}

const TIME_RULE = /curfew|discipline hours|\d{1,2}(:\d\d)?\s*[AP]\.?M/i

// brief: plain-language ordinance text (briefText output), or the raw ordinance as fallback.
// ordinanceText: the original text (topic matching uses both). issue: this resident's insight angle.
export function crowdUser(r, brief, affectedGroups = null, ordinanceText = '', issue = '') {
  const topic = ordinanceText || brief   // relevance from the ordinance text only (see findContradiction)
  const rel = relevantDetails(r.details, topic, r.job, r)
  const work = workAffected(r, affectedGroups)
  const touched = rel.yes.length > 0 || rel.protects.length > 0 || work === true
  const nightParent = rel.yes.some(y => y.startsWith('my work hours'))
  const workLine = work === true
    ? `My work as a ${r.job} IS directly affected by this ordinance; say how it changes my work.`
    : work === false && !nightParent
      ? `My work as a ${r.job} is NOT affected by this ordinance. Do not talk about my job; react as a resident, parent, neighbor, consumer, or citizen.`
      : ''
  const touch = factLines(rel, work === true ? '' : 'So this ordinance restricts nothing I personally do.')
  const home = r.lives_with ? ` Home: ${r.lives_with}.` : ` Household of ${r.household}.`
  // Rules about minors: a resident with no kids still has a real view (the neighbors' kids), so say so
  // instead of letting the model invent a grandson to make it personal.
  const kidsNote = /minor|curfew|discipline hours|youth/i.test(topic) && !(r.details || []).some(d => /teenager|young kids|minor/.test(d))
    ? '\nNo minor lives with me; any kids I mention are the neighbors\' kids.' : ''
  // Time-limited rules: state the hours as one plain line (residents turned 10 PM-5 AM into "after school").
  const win = ordinanceText.match(TIME_WINDOW)
  const hoursNote = win ? `\nIt applies ONLY ${win[0].trim().replace(/\.$/, '')}. Daytime, after school, and early evening are NOT covered.` : ''
  const hours = r.schedule && TIME_RULE.test(topic) ? ` Usual hours: ${r.schedule}.` : ''
  // "Long overdue" is a fine angle for a lawful rule and a terrible one for an unjust one.
  const lawful = /ordinary, lawful regulation/.test(brief)
  const bystander = !lawful && /overdue/.test(r.angle) ? "asks whether it respects every resident's rights" : r.angle
  const angle = touched
    ? `\nInsight angle: ${issue ? `"${issue}"` : INSIGHT_KINDS[(r.id ?? 0) % INSIGHT_KINDS.length]}, seen from ${rel.yes[0] || rel.protects[0] ? `my situation (${rel.yes[0] || rel.protects[0]})` : `my work as a ${r.job}`}.`
    : `\nMy angle on rules that don't touch me: ${bystander}.`
  return `Resident: ${r.age}-year-old ${r.job} (${r.employment}), monthly income: ${r.income}, commutes by ${r.commute}, Purok ${r.purok}.${home}${hours}
${[workLine, touch].filter(Boolean).join('\n')}${kidsNote}
Values: ${r.values}. Outlook: ${r.outlook}. Voice: ${r.voice}. Quote opener: "${OPENERS[(r.id ?? 0) % OPENERS.length]}"${angle}
Ordinance in plain words:
${brief}${hoursNote}`
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

// What each panelist naturally looks for, so the 8 cards don't repeat one loophole.
const PANEL_FOCUS = {
  rudy: 'drivers and people who work long or late hours',
  nena: 'market sellers, wet goods, and daily costs',
  bea: 'how it treats young people',
  lola: 'seniors, health, and the family at home',
  tanod: 'how it would really be enforced on patrol, and the risk of abuse or kotong',
  tess: 'small stores and their customers',
  jessa: 'fairness, dignity, and discrimination',
  atty: 'vague words, missing definitions, and who could exploit them'
}

// issue: one open question from the brief this panelist may take up.
export function panelUser(p, ordinance, brief, neighbors = '', issue = '') {
  const facts = factLines(relevantDetails(p.details, `${brief || ''}\n${ordinance}`, p.role), 'This ordinance restricts nothing I personally do.')
  const focus = PANEL_FOCUS[p.id] ? `\nWhat you notice first (only where it fits this ordinance): ${PANEL_FOCUS[p.id]}.${issue ? ` An open question in the text you may take up: "${issue}".` : ''}` : ''
  return `You are ${p.name}, ${p.role}. ${p.bio}
${facts}${focus}${neighbors ? `\n${neighbors}` : ''}
Ordinance (text):
${ordinance}
${brief ? `\nIn plain words:\n${brief}` : ''}`
}

// ---------- Report ----------

export const REPORT_SYSTEM = `You are a legislative analyst helping a Quezon City councilor improve an ordinance.
You get results from a SIMULATION of residents (not a real survey): stance counts, counts by occupation, compliance, a panel of detailed residents with their loopholes and suggested fixes, and sample quotes.
Write clear, specific English for the councilor. Refer to sections of the ordinance. Build amendments from the most-raised resident concerns, the open questions, and the panel's suggested fixes and loopholes; each reason says who raised it (e.g. "raised by 9 residents, mostly parents").
If the ordinance leaves key details unstated (penalties, definitions, exemptions, enforcement), say so and propose explicit wording.
Read the "Legal and ethical check". If the ordinance is likely unconstitutional or punishes people for who they are, the headline must say so plainly, and the first amendment must recommend withdrawing it or replacing it with a lawful alternative; do not polish an unjust rule. Cite only the facts given.
Keep every field short: headline max 25 words, each list item max 18 words, each amendment field max 30 words.
analysis: think first, max 50 words, private notes: the 2 biggest problems, who carries the burden (use the Fairness line), and which existing sections to change.
headline: one sentence summarizing how residents react; it must match the Overall line.
most_affected: up to 4 items, formatted as "<group>: <the concrete harm THIS ordinance causes them>, avg impact <number from the data>". Never copy the n= or support/mixed/oppose counts.
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
  // Sample quotes: hardest-hit first, then spread across stances. Skip answers whose labels were
  // corrected after the quote was written (the quote may argue the other way).
  const sorted = answered.filter(i => !results[i].adjusted).sort((a, b) => results[b].impact - results[a].impact)
  const picks = new Set(sorted.slice(0, 3))
  for (const s of ['support', 'mixed', 'oppose']) {
    sorted.filter(i => results[i].stance === s && !picks.has(i)).slice(0, 1).forEach(i => picks.add(i))
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
  const voices = ok.filter(x => !x.r.adjusted && (x.r.touches_me !== 'not really' || x.r.stance === 'oppose'))
    .sort((a, b) => b.r.impact - a.r.impact).slice(0, 2)
    .map(x => `${x.p.job}: "${x.r.quote}"`)
  const concerns = clusterInsights(personas, results, 3).map(c => `${c.text} (${c.count})`)
  return `What your neighbors said (simulated): ${pct('support')}% support, ${pct('mixed')}% mixed, ${pct('oppose')}% oppose of ${ok.length}.
Hardest hit: ${hardest.join('; ') || 'no clear group'}.${concerns.length ? `\nConcerns raised (how many residents): ${concerns.join(' | ')}` : ''}
Voices: ${voices.join(' | ')}`
}

// ---------- Togetherness summary ----------
// What the community actually thinks, for the councilor, right after the crowd finishes.

// Mood from the real split (code, so the label can never contradict the numbers).
export function moodOf({ stance, total }) {
  if (!total) return 'No responses yet'
  const pct = s => stance[s] / total * 100
  if (pct('support') >= 70) return 'Broadly supportive'
  if (pct('support') >= 50) return 'Supportive, with reservations'
  if (pct('oppose') >= 70) return 'Strongly opposed'
  if (pct('oppose') >= 50) return 'Mostly opposed'
  return 'Divided'
}

const share = (n, total) => `${Math.round(n / total * 100)}%`

// Instant code-only summary, shown while the model writes the real one (and as its fallback).
export function quickSummary(personas, results) {
  const s = summarizeCrowd(personas, results)
  if (!s.total) return { mood: 'No responses yet', summary: '', source: 'code' }
  const top = clusterInsights(personas, results, 1)[0]
  const hardest = Object.entries(s.byJob).filter(([, v]) => v.n >= 2)
    .sort((a, b) => b[1].impactSum / b[1].n - a[1].impactSum / a[1].n)[0]
  const parts = [`Of ${s.total} simulated residents, ${share(s.stance.support, s.total)} support the draft, ${share(s.stance.mixed, s.total)} are mixed, and ${share(s.stance.oppose, s.total)} oppose it.`]
  if (s.touches['not really'] / s.total > 0.6) parts.push(`Most say it does not change their own week much.`)
  if (hardest && hardest[1].impactSum / hardest[1].n >= 2.5) parts.push(`It weighs most on the ${hardest[0]} group (average impact ${(hardest[1].impactSum / hardest[1].n).toFixed(1)} of 5).`)
  if (top) parts.push(`The most raised point (${top.count} ${top.count === 1 ? 'resident' : 'residents'}): ${top.text.replace(/\.$/, '')}.`)
  return { mood: moodOf(s), summary: parts.join(' '), source: 'code' }
}

export const SUMMARY_SYSTEM = `You summarize what a SIMULATED community of residents thinks about a draft city ordinance, for the councilor who wrote it.
Write 2 or 3 plain English sentences, max 70 words, warm and human but factual.
Say: why the supporters support it, what the others worry about and which groups they are, and any point many residents raised.
Use ONLY the data given. Do not invent numbers, groups, or concerns. Do not restate every percentage; the mood and split are shown separately.
If the legal check says the draft targets people for who they are or is likely unconstitutional, say residents reject it on rights grounds.
${RESPECT}
Answer only in the JSON schema.`

export function summaryUser(ordinance, personas, results, legalCheck = '') {
  const s = summarizeCrowd(personas, results)
  const concerns = clusterInsights(personas, results, 4).map(c => `- raised by ${c.count} (${c.groups.slice(0, 2).join(', ')}): ${clip(c.text, 140)}`).join('\n')
  const quotes = ['support', 'mixed', 'oppose'].flatMap(st => results
    .map((r, i) => (r && !r.error && !r.adjusted && r.stance === st && r.quote ? `${personas[i].job} (${st}): "${clip(r.quote, 120)}"` : null))
    .filter(Boolean).slice(0, 2))
  return `Ordinance:
${clip(ordinance, 1200)}
${legalCheck ? `\n${legalCheck}\n` : ''}
Simulated residents: ${s.total}. Mood: ${moodOf(s)} (${s.stance.support} support, ${s.stance.mixed} mixed, ${s.stance.oppose} oppose).
Touched: ${s.touches.directly} directly, ${s.touches.indirectly} indirectly, ${s.touches['not really']} not really.
Most affected groups:
${groupLines(s.byJob, 4, s.total >= 30 ? 2 : 1)}
${concerns ? `Concerns raised, grouped:\n${concerns}\n` : ''}What residents said:
${quotes.map(q => '- ' + q).join('\n')}`
}

// ---------- Insight clusters (code only) ----------
// Many residents make the same point in different words. Grouping them turns repetition into a
// signal for the councilor ("raised by 12 residents") instead of 12 copies of one line.
const STOP = new Set(('the and for with that this they their from will would should could more need needs like have when what which about into only also than them some just very make sure ' +
  'ordinance barangay city people residents resident ng sa na at ang mga ko po para pero lang yung kasi naman').split(' '))
export const jaccard = (a, b) => { let n = 0; for (const w of a) if (b.has(w)) n++; return n / (a.size + b.size - n || 1) }

// Returns up to n clusters: [{ text, count, groups[], avgImpact }], most important first
// (score = sum of impact, doubled for residents directly touched).
export function clusterInsights(personas, results, n = 5) {
  const clusters = []
  results.forEach((r, i) => {
    if (!r || r.error || !r.insight) return
    const w = words(r.insight)
    if (!w.size) return
    const item = { r, p: personas[i] || {}, w }
    let best = null, bestSim = 0
    for (const c of clusters) { const s = jaccard(w, c.seed); if (s > bestSim) { bestSim = s; best = c } }
    if (best && bestSim >= 0.3) best.members.push(item)
    else clusters.push({ seed: w, members: [item] })
  })
  const weight = m => m.r.impact * (m.r.touches_me === 'directly' ? 2 : 1)
  return clusters.map(c => {
    const rep = [...c.members].sort((a, b) => weight(b) - weight(a))[0]
    return {
      text: rep.r.insight,
      count: c.members.length,
      groups: [...new Set(c.members.map(m => m.p.group || m.p.job).filter(Boolean))],
      avgImpact: +(c.members.reduce((s, m) => s + m.r.impact, 0) / c.members.length).toFixed(1),
      score: c.members.reduce((s, m) => s + weight(m), 0)
    }
  }).sort((a, b) => b.score - a.score).slice(0, n).map(({ score, ...c }) => c)
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

// insights: clusterInsights output; issues: the brief's open questions.
export function reportUser(ordinance, summary, panelAnswers, legalCheck = '', fairnessFlag = '', insights = [], issues = []) {
  const concerns = insights.slice(0, 5)
    .map(c => `- raised by ${c.count} (${c.groups.slice(0, 2).join(', ')}; avg impact ${c.avgImpact}): ${clip(c.text, 150)}`).join('\n')
  const open = issues.slice(0, 4).map(i => '- ' + clip(i, 110)).join('\n')
  const jobs = groupLines(summary.byJob, 5, summary.total >= 30 ? 2 : 1)   // a group of 1 is an anecdote, not a pattern
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
${concerns ? `\nResident concerns, grouped:\n${concerns}\n` : ''}${open ? `\nOpen questions in the text:\n${open}\n` : ''}
Panel:
${panel}

Sample quotes:
${summary.quotes.slice(0, 2).map(q => '- ' + q).join('\n')}`
}
