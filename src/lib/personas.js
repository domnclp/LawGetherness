// Seeded crowd generator. Plain code, no AI: same seed = same residents every run,
// so before/after comparisons are fair.
//
// The 200 adults follow a NATIONAL, APPROXIMATE mix based on the PSA Labor Force Survey
// (July 2026): 120 employed, 8 unemployed, 72 not in the labor force. Some splits are
// estimates (marked below). Exact counts are quotas, not random draws.

// mulberry32: small, fast, deterministic PRNG.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Pick from [[value, weight], ...]
function weighted(rng, table) {
  const total = table.reduce((s, [, w]) => s + w, 0)
  let r = rng() * total
  for (const [v, w] of table) { if ((r -= w) < 0) return v }
  return table[table.length - 1][0]
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]

// ---------- The mix ----------
// Income labels. Earners: their own monthly income. Non-earners: household income.
const LOW = 'below ₱10k', MID = '₱10–25k', UPPER = '₱25–50k', HIGH = 'above ₱50k'
const HH = b => `no income of their own; household earns ${b}`

const W = 'wage/salary', SELF = 'self-employed', UNPAID = 'unpaid family worker', EMP = 'employer'
const UNEMP = 'unemployed', NILF = 'not in the labor force'

// [group, job, employment, count, [minAge, maxAge], income table, commute table, drives?]
// Group counts follow the spec; the job/employment breakdown inside each group is chosen so
// employment totals come out exactly 79 wage/salary, 33 self-employed, 6 unpaid family, 2 employers.
const ROLES = [
  // Farmers: 21
  ['farmer', 'rice and vegetable farmer (own or tenant farm)', SELF, 9, [30, 68], [[LOW, 6], [MID, 4]], [['walking', 5], ['motorcycle', 3], ['tricycle', 2]]],
  ['farmer', 'farm laborer', W, 8, [19, 60], [[LOW, 8], [MID, 2]], [['walking', 6], ['bicycle', 4]]],
  ['farmer', 'helps on the family farm', UNPAID, 3, [18, 40], [[HH(LOW), 1]], [['walking', 1]]],
  ['farmer', 'farm owner who hires farmhands', EMP, 1, [45, 65], [[UPPER, 1]], [['motorcycle', 1]], 'motorcycle'],
  // Fisherfolk: 3
  ['fisherfolk', 'fisherman with a small boat', SELF, 3, [22, 62], [[LOW, 8], [MID, 2]], [['walking', 1]]],
  // Construction: 12
  ['construction worker', 'construction worker', W, 12, [19, 55], [[LOW, 4], [MID, 6]], [['jeepney', 5], ['motorcycle', 3], ['walking', 2]]],
  // Factory: 9
  ['factory worker', 'factory worker', W, 9, [19, 50], [[MID, 8], [LOW, 2]], [['jeepney', 5], ['tricycle', 3], ['motorcycle', 2]]],
  // Vendors / sari-sari owners / store clerks: 22
  ['vendor / store worker', 'market vendor', SELF, 8, [22, 65], [[LOW, 6], [MID, 4]], [['tricycle', 5], ['jeepney', 3], ['walking', 2]]],
  ['vendor / store worker', 'sari-sari store owner', SELF, 5, [30, 68], [[LOW, 4], [MID, 5], [UPPER, 1]], [['walking', 1]]],
  ['vendor / store worker', 'store clerk', W, 6, [18, 40], [[LOW, 4], [MID, 6]], [['jeepney', 5], ['tricycle', 5]]],
  ['vendor / store worker', 'helps in the family sari-sari store', UNPAID, 3, [18, 35], [[HH(LOW), 1]], [['walking', 1]]],
  // Government employees: 12
  ['government employee', 'public school teacher', W, 4, [24, 60], [[UPPER, 8], [MID, 2]], [['tricycle', 4], ['motorcycle', 3], ['jeepney', 3]]],
  ['government employee', 'city or barangay hall staff', W, 5, [24, 60], [[MID, 5], [UPPER, 5]], [['jeepney', 4], ['motorcycle', 3], ['tricycle', 3]]],
  ['government employee', 'police officer', W, 3, [25, 55], [[UPPER, 6], [MID, 4]], [['motorcycle', 1]]],
  // Drivers (estimate): 11
  ['driver', 'tricycle driver (owns the unit)', SELF, 3, [25, 62], [[LOW, 5], [MID, 5]], [['own tricycle', 1]], 'tricycle'],
  ['driver', 'tricycle driver (pays boundary to an operator)', W, 2, [22, 60], [[LOW, 7], [MID, 3]], [['the tricycle they drive for work', 1]], 'tricycle'],
  ['driver', 'jeepney driver', W, 3, [25, 62], [[LOW, 4], [MID, 6]], [['the jeepney they drive for work', 1]], 'jeepney'],
  ['driver', 'delivery rider', W, 3, [20, 40], [[MID, 7], [LOW, 3]], [['own motorcycle', 1]], 'motorcycle'],
  // Food service (estimate): 8
  ['food service worker', 'carinderia or fast-food crew', W, 7, [18, 45], [[LOW, 5], [MID, 5]], [['jeepney', 4], ['tricycle', 4], ['walking', 2]]],
  ['food service worker', 'small carinderia owner who hires a helper', EMP, 1, [35, 60], [[UPPER, 1]], [['walking', 1]]],
  // Other services (estimate): 8
  ['service worker', 'kasambahay (household helper)', W, 3, [19, 55], [[LOW, 1]], [['walking', 1]]],
  ['service worker', 'salon stylist', W, 1, [20, 45], [[LOW, 6], [MID, 4]], [['jeepney', 1]]],
  ['service worker', 'salon owner-stylist', SELF, 1, [25, 55], [[MID, 1]], [['walking', 1]]],
  ['service worker', 'gadget and appliance repair technician', SELF, 2, [22, 55], [[LOW, 5], [MID, 5]], [['motorcycle', 1]], 'motorcycle'],
  ['service worker', 'repair shop worker', W, 1, [19, 45], [[LOW, 1]], [['jeepney', 1]]],
  // BPO / admin (estimate): 7
  ['BPO / admin worker', 'BPO agent', W, 4, [20, 38], [[MID, 5], [UPPER, 5]], [['jeepney', 4], ['motorcycle', 3], ['tricycle', 3]]],
  ['BPO / admin worker', 'office admin staff', W, 3, [22, 50], [[MID, 6], [UPPER, 4]], [['jeepney', 6], ['tricycle', 4]]],
  // Health workers / professionals (estimate): 7
  ['health worker / professional', 'nurse or barangay health worker', W, 5, [23, 58], [[MID, 4], [UPPER, 6]], [['tricycle', 4], ['jeepney', 4], ['motorcycle', 2]]],
  ['health worker / professional', 'self-employed professional (accountant or engineer)', SELF, 2, [28, 60], [[HIGH, 6], [UPPER, 4]], [['private car', 1]], 'car'],
  // Unemployed: 8
  ['unemployed', 'unemployed, looking for work', UNEMP, 8, [19, 55], [[HH(LOW), 6], [HH(MID), 4]], [['walking', 5], ['jeepney', 5]]],
  // Not in the labor force: 72 (25 / 27 / 20 split is an estimate)
  ['student', 'college student', NILF, 25, [18, 24], [[HH(LOW), 4], [HH(MID), 4], [HH(UPPER), 2]], [['jeepney', 4], ['tricycle', 4], ['walking', 2]]],
  ['homemaker', 'homemaker', NILF, 27, [22, 65], [[HH(LOW), 4], [HH(MID), 4], [HH(UPPER), 2]], [['walking', 5], ['tricycle', 5]]],
  ['senior / retiree', 'senior citizen / retiree', NILF, 20, [60, 85], [['pension below ₱10k', 7], ['pension ₱10–25k', 2], [HH(LOW), 4]], [['tricycle', 6], ['walking', 4]]]
]

// Summary of the mix for the UI. Label must say "national, approximate".
export const CROWD_MIX = {
  label: 'National mix, approximate',
  source: 'Based on the PSA Labor Force Survey, July 2026 (200 adults: 120 employed, 8 unemployed, 72 not in the labor force). Some splits are estimates.',
  groups: Object.entries(ROLES.reduce((m, r) => ((m[r[0]] = (m[r[0]] || 0) + r[3]), m), {})).map(([group, count]) => ({ group, count })),
  employment: ROLES.reduce((m, r) => ((m[r[2]] = (m[r[2]] || 0) + r[3]), m), {})
}

const FIRST_NAMES = [
  'Rudy', 'Nena', 'Jun', 'Marites', 'Carlo', 'Liza', 'Ramon', 'Joy', 'Dodong', 'Inday',
  'Bong', 'Cora', 'Paolo', 'Jhoanna', 'Ernesto', 'Bea', 'Mario', 'Lorna', 'Kevin', 'Tess',
  'Rolando', 'Mylene', 'JM', 'Aiza', 'Nestor', 'Grace', 'Ronnie', 'Fe', 'Mark', 'Precious',
  'Edgar', 'Rowena', 'Jayson', 'Merly', 'Arnel', 'Kristine', 'Boyet', 'Analyn', 'Rey', 'Divina'
]
const LAST_NAMES = [
  'Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Torres', 'Villanueva', 'Ramos', 'Aquino',
  'Dela Cruz', 'Castillo', 'Flores', 'Navarro', 'Pascual', 'Manalo', 'Salazar', 'Dizon', 'Lopez', 'Gonzales'
]

// Attitude toward rules in general. Without this the model makes everyone oppose;
// real barangays have residents who welcome order, ones who only count pesos, and skeptics.
const DISPOSITIONS = [
  ['you value safety, order, and discipline, and welcome rules that do not take food off your table', 3],
  ['you are community-minded and will accept some personal sacrifice if it helps the barangay', 2],
  ['you are practical: you judge a rule only by how it changes your money and time', 3],
  ['you are easygoing and rarely bothered by rules that do not touch your daily routine', 2],
  ['you distrust local officials and suspect new rules are about fines and kotong', 2]
]

// How the resident talks. Gives quotes different voices instead of one repeated opener.
const VOICES = [
  'blunt and direct, gets straight to the point',
  'respectful, uses "po" and "opo"',
  'jokey, makes a light biro even when annoyed',
  'warm, thinks about family and neighbors',
  'upbeat and optimistic, likes seeing the barangay improve',
  'practical, talks in pesos and minutes',
  'curious, asks a short question',
  'calm and matter-of-fact'
]

// What a resident talks about when an ordinance doesn't touch them personally.
// Without it, bystanders all repeat "we must follow it for the barangay".
// Angles never name another sector or a relative: judges found those invite borrowed concerns
// ("fair to vendors and drivers") and invented kids. Keep 9 entries so the seeded crowd is unchanged.
const ANGLES = [
  'doubts it will really be enforced, or fears only the poor will be caught',
  'names which kind of household on the street it hurts most',
  'says it is long overdue and wishes it came sooner',
  'worries it will become another source of kotong or fines',
  'thinks about the health and safety of the children in the area',
  'wants the barangay to explain it properly first before enforcing',
  'doubts it will be enforced past the first month',
  'cares whether it is fair to low-income households',
  'asks what the city will do first to make it easy to follow'
]

// Who lives in the home, stated plainly, so the model never invents children ("my son Ben").
// Derived from household size and the kid details; uses no randomness (the crowd stays identical).
function livesWith(p) {
  if (p.household === 1) return 'lives alone'
  const others = p.household - 1
  if (p.details.some(d => /teenager/.test(d))) return `lives with ${others} family members, including a teenager (13-17)`
  if (p.details.some(d => /young kids/.test(d))) return `lives with ${others} family members, including young kids in elementary school`
  if (p.group === 'student') return `lives with family (${others} others); no children of their own`
  return `lives with ${others} other adults; no children under 18 at home`
}

// Usual working hours. Shown only for time-based ordinances (a curfew), where a parent who
// works nights is the real story.
const SCHEDULES = [
  [/BPO agent/, 'works the night shift, about 10 PM to 7 AM'],
  [/nurse|police/, 'works rotating 12-hour shifts, some at night'],
  [/fisherman/, 'goes out fishing before dawn, about 3 AM to 9 AM'],
  [/tricycle|jeepney/, 'drives from about 5 AM until 9 PM'],
  [/delivery rider/, 'delivers until late at night'],
  [/fast-food crew/, 'works shifts that sometimes end late at night'],
  [/market vendor/, 'at the market from 4 AM until mid-afternoon'],
  [/farm/, 'in the fields from dawn until afternoon'],
  [/student/, 'has classes during the day'],
  [/homemaker|senior/, 'at home most of the day'],
  [/unemployed/, 'looks for work during the day']
]
const scheduleOf = job => (SCHEDULES.find(([re]) => re.test(job)) || [, 'works regular day hours'])[1]

// Personal values: matter most for social ordinances (curfew, anti-discrimination).
const VALUES = [['traditional and religious', 3], ['moderate', 4], ['progressive', 2]]

// Everyday life details that decide whether an ordinance actually touches someone
// (a smoking ban means little to a non-smoker; a curfew matters to parents of teens).
// Rough rates; approximate, not census data.
function lifeDetails(rng, p, drives) {
  const d = []
  const { age, job, income, household, commute, employment } = p
  if (drives === 'tricycle' || drives === 'jeepney') d.push(`drives a ${drives} on city roads every day for work`)
  else if (drives === 'motorcycle' || /motorcycle/.test(commute)) d.push('drives a motorcycle on city roads every day')
  else if (drives === 'car' || /private car/.test(commute)) d.push('drives a private car on city roads every day')
  if (rng() < 0.22) d.push('smokes cigarettes daily')
  if (age <= 35 && rng() < 0.12) d.push('vapes')
  if (age >= 25 && age <= 60 && household >= 3 && rng() < 0.7) {
    d.push(rng() < 0.5 ? 'has a teenager (13-17) at home who goes out with friends at night' : 'has young kids in elementary school')
  }
  const carOdds = income.includes(HIGH) ? 0.8 : income.includes(UPPER) ? 0.35 : 0.04
  if (drives !== 'car' && rng() < carOdds) d.push(rng() < 0.6 ? 'owns a car and parks it on the street outside the house' : 'owns a car with a garage')
  if (rng() < 0.2) d.push('sometimes drinks with neighbors outside in the evening')
  if (rng() < 0.07) d.push('is LGBTQ+')
  if (/vendor|sari-sari|store clerk/.test(job) && rng() < 0.85) d.push('hands out plastic bags to customers every day')
  if (/carinderia owner/.test(job)) d.push('runs a small carinderia that serves takeout with disposable spoons and containers')
  if (/carinderia or fast-food crew/.test(job)) d.push('works in food service that packs takeout in disposable containers')
  if (employment === EMP) d.push('hires a few workers')
  if (rng() < 0.3) d.push('often orders takeout or food delivery')
  if (rng() < 0.12) d.push('sometimes drops wrappers on the street when no trash bin is nearby')
  return d
}

// Builds all 200 residents, then orders them so every group is spread evenly through the
// list: the first 50 or 100 (smaller runs) keep roughly the same national mix.
function buildAll(seed) {
  const rng = mulberry32(seed)
  const all = []
  for (const [group, job, employment, count, [lo, hi], incomes, commutes, drives] of ROLES) {
    const offset = rng()
    for (let k = 0; k < count; k++) {
      const age = lo + Math.floor(rng() * (hi - lo + 1))
      const p = {
        name: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
        age, group, job, employment,
        income: weighted(rng, incomes),
        commute: weighted(rng, commutes),
        household: 1 + Math.floor(rng() * 7),     // 1–7 people
        purok: 1 + Math.floor(rng() * 7),         // Purok 1–7
        outlook: weighted(rng, DISPOSITIONS),
        voice: pick(rng, VOICES),
        values: weighted(rng, VALUES),
        angle: pick(rng, ANGLES)
      }
      p.details = lifeDetails(rng, p, drives)
      p.lives_with = livesWith(p)
      p.schedule = scheduleOf(job)
      // Even spread: k-th of `count` sits at fraction (k + offset) / count of the list.
      all.push({ p, key: (k + offset) / count, tie: rng() })
    }
  }
  all.sort((a, b) => a.key - b.key || a.tie - b.tie)
  return all.map(({ p }, id) => ({ id, ...p }))
}

const cache = new Map()
export function generateCrowd(n = 200, seed = 42) {
  if (!cache.has(seed)) cache.set(seed, buildAll(seed))
  return cache.get(seed).slice(0, n)
}

// Occupation groups in display order (for filters).
export const JOBS = [...new Set(ROLES.map(r => r[0]))]
