// Seeded crowd generator. Plain code, no AI: same seed = same residents every run,
// so before/after comparisons are fair. The trait mix is approximate, not census data.

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

// Occupation drives the other traits so residents make sense
// (a tricycle driver drives a tricycle; a student is young and earns little).
// ages: [min, max]; income/commute: weighted tables
const OCCUPATIONS = [
  ['tricycle driver',      12, { ages: [22, 60], income: [['below ₱10k', 6], ['₱10–25k', 4]],               commute: [['own tricycle', 1]] }],
  ['jeepney driver',        6, { ages: [25, 62], income: [['below ₱10k', 4], ['₱10–25k', 6]],               commute: [['own jeepney', 1]] }],
  ['market vendor',        10, { ages: [20, 65], income: [['below ₱10k', 6], ['₱10–25k', 4]],               commute: [['tricycle', 5], ['jeepney', 3], ['walking', 2]] }],
  ['sari-sari store owner', 8, { ages: [28, 68], income: [['below ₱10k', 4], ['₱10–25k', 5], ['₱25–50k', 1]], commute: [['walking', 7], ['tricycle', 3]] }],
  ['construction worker',   8, { ages: [18, 55], income: [['below ₱10k', 5], ['₱10–25k', 5]],               commute: [['jeepney', 5], ['motorcycle', 3], ['walking', 2]] }],
  ['BPO agent',             7, { ages: [20, 38], income: [['₱10–25k', 5], ['₱25–50k', 5]],                  commute: [['jeepney', 4], ['motorcycle', 3], ['tricycle', 3]] }],
  ['student',              10, { ages: [16, 23], income: [['below ₱10k', 8], ['₱10–25k', 2]],               commute: [['tricycle', 4], ['jeepney', 4], ['walking', 2]] }],
  ['public school teacher', 5, { ages: [24, 60], income: [['₱25–50k', 8], ['₱10–25k', 2]],                  commute: [['tricycle', 4], ['motorcycle', 3], ['jeepney', 3]] }],
  ['OFW family member',     6, { ages: [25, 65], income: [['₱25–50k', 5], ['₱10–25k', 3], ['above ₱50k', 2]], commute: [['tricycle', 5], ['private car', 3], ['jeepney', 2]] }],
  ['senior citizen',        8, { ages: [60, 85], income: [['below ₱10k', 7], ['₱10–25k', 3]],               commute: [['tricycle', 6], ['walking', 4]] }],
  ['fisherfolk',            5, { ages: [20, 65], income: [['below ₱10k', 8], ['₱10–25k', 2]],               commute: [['walking', 5], ['bicycle', 3], ['tricycle', 2]] }],
  ['government employee',   5, { ages: [25, 60], income: [['₱25–50k', 6], ['₱10–25k', 3], ['above ₱50k', 1]], commute: [['motorcycle', 4], ['private car', 3], ['jeepney', 3]] }],
  ['small business owner',  6, { ages: [28, 62], income: [['₱25–50k', 5], ['above ₱50k', 4], ['₱10–25k', 1]], commute: [['private car', 6], ['motorcycle', 4]] }]
]

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
const ANGLES = [
  'doubts it will really be enforced, or fears only the poor will be caught',
  'thinks of a specific neighbor or relative it will hurt',
  'says it is long overdue and wishes it came sooner',
  'worries it will become another source of kotong or fines',
  'thinks about the health and safety of the children in the area',
  'wants the barangay to explain it properly first before enforcing',
  'compares it to a past ordinance that was forgotten after a month',
  'cares whether it is fair to small earners like vendors and drivers',
  'asks what the city will provide in return (bins, signs, parking, programs)'
]

// Personal values: matter most for social ordinances (curfew, anti-discrimination).
const VALUES = [['traditional and religious', 3], ['moderate', 4], ['progressive', 2]]

// Everyday life details that decide whether an ordinance actually touches someone
// (a smoking ban means little to a non-smoker; a curfew matters to parents of teens).
// Rough rates for an urban Philippine barangay; approximate, not census data.
function lifeDetails(rng, age, job, income, household, commute) {
  const d = []
  if (/own tricycle|own jeepney|motorcycle|private car/.test(commute)) d.push(`drives a ${commute.replace('own ', '')} on city roads every day`)
  if (age < 18) d.push('is a minor (under 18)')
  if (age >= 18 && rng() < 0.22) d.push('smokes cigarettes daily')
  if (age >= 16 && age <= 35 && rng() < 0.12) d.push('vapes')
  if (age >= 25 && age <= 60 && household >= 3 && rng() < 0.7) {
    d.push(rng() < 0.5 ? 'has a teenager (13-17) at home who goes out with friends at night' : 'has young kids in elementary school')
  }
  const carOdds = income === 'above ₱50k' ? 0.8 : income === '₱25–50k' ? 0.35 : 0.04
  if (rng() < carOdds) d.push(rng() < 0.6 ? 'owns a car and parks it on the street outside the house' : 'owns a car with a garage')
  if (age >= 18 && rng() < 0.2) d.push('sometimes drinks with neighbors outside in the evening')
  if (rng() < 0.07) d.push('is LGBTQ+')
  if (/vendor|sari-sari|small business/.test(job) && rng() < 0.7) d.push('hands out plastic bags to customers every day')
  if (/small business/.test(job) && rng() < 0.4) d.push('runs a small carinderia that serves takeout with disposable spoons and containers')
  if (/small business|sari-sari/.test(job) && rng() < 0.5) d.push('hires a few workers')
  if (rng() < 0.3) d.push('often orders takeout or food delivery')
  if (rng() < 0.12) d.push('sometimes drops wrappers on the street when no trash bin is nearby')
  return d
}

const occupationTable = OCCUPATIONS.map(([job, w, info]) => [{ job, ...info }, w])

export function generateCrowd(n = 200, seed = 42) {
  const rng = mulberry32(seed)
  const crowd = []
  for (let i = 0; i < n; i++) {
    const occ = weighted(rng, occupationTable)
    const [lo, hi] = occ.ages
    const age = lo + Math.floor(rng() * (hi - lo + 1))
    const income = weighted(rng, occ.income)
    const household = 1 + Math.floor(rng() * 7)   // 1–7 people
    const commute = weighted(rng, occ.commute)
    crowd.push({
      id: i,
      name: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      age,
      job: occ.job,
      income,
      commute,
      household,
      purok: 1 + Math.floor(rng() * 7),           // Purok 1–7
      outlook: weighted(rng, DISPOSITIONS),
      voice: pick(rng, VOICES),
      values: weighted(rng, VALUES),
      angle: pick(rng, ANGLES),
      details: lifeDetails(rng, age, occ.job, income, household, commute)
    })
  }
  return crowd
}

export const JOBS = OCCUPATIONS.map(([job]) => job)
