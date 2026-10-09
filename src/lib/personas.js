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

const occupationTable = OCCUPATIONS.map(([job, w, info]) => [{ job, ...info }, w])

export function generateCrowd(n = 200, seed = 42) {
  const rng = mulberry32(seed)
  const crowd = []
  for (let i = 0; i < n; i++) {
    const occ = weighted(rng, occupationTable)
    const [lo, hi] = occ.ages
    crowd.push({
      id: i,
      name: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      age: lo + Math.floor(rng() * (hi - lo + 1)),
      job: occ.job,
      income: weighted(rng, occ.income),
      commute: weighted(rng, occ.commute),
      household: 1 + Math.floor(rng() * 7),       // 1–7 people
      purok: 1 + Math.floor(rng() * 7)            // Purok 1–7
    })
  }
  return crowd
}

export const JOBS = OCCUPATIONS.map(([job]) => job)
