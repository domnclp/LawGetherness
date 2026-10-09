// Remembers finished runs so an unchanged ordinance comes back instantly.
// Three layers, checked in order:
//   1. memory  - runs finished in this session
//   2. browser - the last few runs, in localStorage (per viewer; may be unavailable, then skipped)
//   3. saved   - pre-computed runs shipped in public/runs/<sampleId>.json (the presets)
// An entry is only used if it was made by the same engine version and model: any prompt change
// bumps ENGINE_VERSION and old answers are ignored (the run goes live).
//
// Entry: { version, model, text, brief, crowd: { [personaId]: reaction },
//          bySize: { [size]: { panel, summary, report } }, origin: 'memory' | 'saved' }

const STORE_KEY = 'lawgetherness-runs'
const STORE_MAX = 5

// FNV-1a: short, stable key for an ordinance text.
export function hashText(text = '') {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(16)
}

const memory = new Map()          // key -> entry
const savedTried = new Map()      // key -> Promise<entry|null> (each saved file is fetched once)

function readStore() {
  try { return JSON.parse(globalThis.localStorage?.getItem(STORE_KEY) || '{}') || {} } catch { return {} }
}
function writeStore(entry, key) {
  try {
    if (!globalThis.localStorage) return
    const all = readStore()
    all[key] = { ...entry, at: Date.now() }
    const keep = Object.entries(all).sort((a, b) => b[1].at - a[1].at).slice(0, STORE_MAX)
    globalThis.localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(keep)))
  } catch { /* storage full or blocked: memory still works */ }
}

const valid = (e, version, model, text) => e && e.version === version && e.model === model && e.text === text

// Finds a usable entry for this ordinance, or null. savedId: the preset id whose saved file may match.
export async function findRun(text, { version, model, savedId }) {
  const key = `${version}|${model}|${hashText(text)}`
  const mem = memory.get(key)
  if (valid(mem, version, model, text)) return mem
  const stored = readStore()[key]
  if (valid(stored, version, model, text)) { memory.set(key, { ...stored, origin: 'memory' }); return memory.get(key) }
  if (!savedId || typeof fetch !== 'function') return null
  if (!savedTried.has(key)) {
    savedTried.set(key, fetch(`/runs/${savedId}.json`)
      .then(r => (r.ok ? r.json() : null))
      .then(e => (valid(e, version, model, text) ? { ...e, origin: 'saved' } : null))
      .catch(() => null))
  }
  const saved = await savedTried.get(key)
  if (saved && !memory.has(key)) memory.set(key, saved)
  return memory.get(key) || null
}

// Creates or updates the entry for this ordinance and persists it (memory + browser storage).
// patch: { brief?, crowd?: { [id]: reaction }, size?, panel?, summary?, report? }
export function saveRun(text, { version, model }, patch) {
  const key = `${version}|${model}|${hashText(text)}`
  const e = memory.get(key) || { version, model, text, brief: null, crowd: {}, bySize: {}, origin: 'memory' }
  if (patch.brief) e.brief = patch.brief
  if (patch.crowd) Object.assign(e.crowd, patch.crowd)
  if (patch.size) {
    const slot = (e.bySize[patch.size] ||= {})
    for (const k of ['panel', 'summary', 'report']) if (patch[k]) slot[k] = patch[k]
  }
  memory.set(key, e)
  writeStore(e, key)
  return e
}

// Plain JSON copy of an entry, for writing public/runs/<id>.json (used by the pre-compute script).
export function exportRun(text, { version, model }) {
  const e = memory.get(`${version}|${model}|${hashText(text)}`)
  if (!e) return null
  const { origin, at, ...plain } = e
  return plain
}
