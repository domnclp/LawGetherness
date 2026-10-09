import { useEffect, useRef, useState } from 'react'

import { chat } from './lib/ollama.js'
import { runPool } from './lib/pool.js'
import { generateCrowd as population, JOBS as jobs } from './lib/personas.js'
import { crowdSchema } from './lib/schemas.js'
import { CROWD_SYSTEM, crowdUser } from './lib/prompts.js'

const samples = [
  { title: 'Tricycle access on the national highway', text: 'DRAFT ORDINANCE NO. 001\nRegulating tricycle access on the national highway\n\nSECTION 1. Purpose\nTo reduce traffic congestion and improve road safety within the barangay.\n\nSECTION 2. Restricted hours\nTricycles shall not operate on the national highway from 6:00 AM to 9:00 PM daily.\n\nSECTION 3. Enforcement\nBarangay traffic personnel shall enforce this restriction. A fine of ₱500 shall apply for each violation.\n\nSECTION 4. Effectivity\nThis ordinance shall take effect fifteen days after posting.' },
  { title: 'Single-use plastic at the public market', text: 'DRAFT ORDINANCE NO. 002\nReducing single-use plastic at the public market\n\nSECTION 1. Market vendors shall stop providing single-use plastic bags to customers.\n\nSECTION 2. Customers are encouraged to bring reusable containers.\n\nSECTION 3. Vendors shall pay a ₱300 fine per violation.\n\nSECTION 4. This ordinance takes effect thirty days after posting.' },
  { title: 'Evening quiet hours in residential areas', text: 'DRAFT ORDINANCE NO. 003\nEstablishing quiet hours in residential areas\n\nSECTION 1. Amplified music, karaoke, and loud construction work are prohibited from 10:00 PM to 6:00 AM.\n\nSECTION 2. Barangay personnel shall respond to complaints.\n\nSECTION 3. A first violation receives a warning. Subsequent violations incur a ₱500 fine.' },
]

const exampleQuotes = ['Paano na ang pasada ko kung wala pang alternatibong ruta?', 'Mas maayos ang trapiko, pero sana may oras para makapag-adjust.', 'Sana may ligtas at abot-kayang sakay papunta sa school.', 'Makakatulong ito kung malinaw ang patakaran para sa lahat.']
const preview = Object.fromEntries(population(50).map(r => [r.id, { stance: r.id % 10 < 4 ? 'support' : r.id % 10 < 7 ? 'mixed' : 'oppose', impact: r.id % 5 + 1, comply: 'partial', quote: exampleQuotes[r.id % 10 < 4 ? 3 : r.id % 10 < 7 ? 1 : r.id % 2 === 0 ? 0 : 2] }]))
const stances = ['support', 'mixed', 'oppose']

function Icon({ name, size = 20 }) {
  const paths = { leaf: 'M19 3C8 2 3 7 5 14c2 7 12 5 14-11ZM5 20 15 8M8 15h5', grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', arrow: 'M5 12h14m-6-6 6 6-6 6', document: 'M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8M8 16h6', shield: 'M12 3 3 6v6c0 5 9 9 9 9s9-4 9-9V6l-9-3Zm-4 9 3 3 5-6', people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-4M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm7 0a4 4 0 0 1 0 8', spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z' }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.document} /></svg>
}
export default function App() {
  const [draft, setDraft] = useState(samples[0].text)
  const [sample, setSample] = useState('0')
  const [size, setSize] = useState(50)
  const [residents, setResidents] = useState(() => population(50))
  const [results, setResults] = useState(preview)
  const [mode, setMode] = useState('preview')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [job, setJob] = useState('all')
  const [purok, setPurok] = useState('all')
  const [selected, setSelected] = useState(0)
  const [online, setOnline] = useState(navigator.onLine)
  const [previous, setPrevious] = useState(null)
  const [runDraft, setRunDraft] = useState('')
  const [mapZoom, setMapZoom] = useState(1)
  const controller = useRef(null)
  const cancelled = useRef(false)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); controller.current?.abort() }
  }, [])
  const completed = Object.values(results).filter(r => r && !r.failed)
  const counts = stances.map(s => completed.filter(r => r.stance === s).length)
  const percentages = counts.map(n => completed.length ? Math.round(n / completed.length * 100) : 0)
  const done = Object.keys(results).length
  const visible = residents.filter(r => (filter === 'all' || results[r.id]?.stance === filter) && (job === 'all' || r.job === job) && (purok === 'all' || r.purok === Number(purok)))
  const clusteredResidents = [...visible].sort((a, b) => a.purok - b.purok || a.job.localeCompare(b.job) || a.id - b.id)
  const purokGroups = [1, 2, 3, 4, 5, 6, 7].map(number => ({ number, residents: clusteredResidents.filter(resident => resident.purok === number) })).filter(group => group.residents.length)
  const mapDensity = residents.length >= 200 ? 'dense-map' : residents.length >= 100 ? 'compact-map' : ''
  const person = residents.find(r => r.id === selected)
  const reaction = results[selected]
  async function run() {
    if (!draft.trim() || running) return
    if (mode === 'live' && completed.length) setPrevious({ percentages, count: residents.length })
    const people = population(size)
    setResidents(people); setResults({}); setMode('live'); setError(''); setRunning(true); setSelected(0); setFilter('all'); setRunDraft(draft); setMapZoom(size >= 200 ? 0.75 : size >= 100 ? 0.9 : 1)
    cancelled.current = false
    const abort = new AbortController(); controller.current = abort
    try {
      const tasks = people.map(resident => async signal => {
        const result = await chat({ system: CROWD_SYSTEM, user: crowdUser(resident, draft), schema: crowdSchema, signal })
        if (!stances.includes(result.stance) || typeof result.quote !== 'string' || !Number.isInteger(result.impact) || result.impact < 1 || result.impact > 5 || !['comply', 'partial', 'evade'].includes(result.comply)) throw new Error('Invalid response')
        return result
      })
      await runPool(tasks, {
        concurrency: 2,
        signal: abort.signal,
        onResult: (index, result) => {
          if (!abort.signal.aborted) setResults(old => ({ ...old, [people[index].id]: result || { failed: true } }))
        },
      })
    } catch (err) {
      abort.abort()
      setError(err.message)
    }
    if (cancelled.current) setError('Simulation stopped. Completed reactions are kept below.')
    setRunning(false)
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#workspace" aria-label="LawGetherness workspace" title="LawGetherness"><span className="brand-mark"><Icon name="leaf" size={27} /></span><span>LawGetherness<small>ORDINANCE WIND TUNNEL</small></span></a>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="rail-nav" aria-label="Workspace navigation"><a className="nav-item active" href="#workspace" aria-label="Draft ordinance" title="Draft ordinance"><Icon name="grid" /><span>Draft ordinance</span><small>01</small></a><a className="nav-item" href="#community" aria-label="Resident map" title="Resident map"><Icon name="people" /><span>Resident map</span></a><a className="nav-item" href="#insights" aria-label="Review and refine" title="Review and refine"><Icon name="spark" /><span>Review & refine</span></a></nav>
      <div className="rail-status" title="Local inference"><Icon name="shield" size={18} /><i className="status-dot" /></div>
    </aside>
    <main id="workspace">
      <header className="topbar"><div>Workspace <span>/</span> <strong>Ordinance simulator</strong></div><span className="connection"><i className={`status-dot ${online ? '' : 'offline'}`} />{online ? 'Internet connected' : 'Internet disconnected'}</span></header>
      <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow">LOCAL POLICY SIMULATOR</div><h1>Test your ordinance before it becomes law.</h1><p>See possible effects across your community before filing a draft.</p></div><span className="private-tag"><Icon name="shield" size={16} /> Runs locally</span></div>
        <p className="workflow-hint">Draft an ordinance, run a local simulation, then review the resident map.</p>
        <div className="workspace-grid">
          <section className="card draft-card" id="draft">
            <div className="card-heading"><span className="section-icon"><Icon name="document" /></span><div><h2>Your draft ordinance</h2><p>A starting point for a thoughtful conversation.</p></div><span className="tiny-label">01</span></div>
            <label className="field-label" htmlFor="sample">START WITH AN EXAMPLE</label>
            <select id="sample" value={sample} disabled={running} onChange={e => { setSample(e.target.value); if (e.target.value !== 'custom') setDraft(samples[Number(e.target.value)].text) }}><option value="custom">Your own ordinance</option>{samples.map((s, i) => <option key={s.title} value={i}>{s.title}</option>)}</select>
            <div className="editor-heading"><label className="field-label" htmlFor="ordinance">ORDINANCE TEXT</label><span>Editable draft</span></div>
            <textarea id="ordinance" value={draft} disabled={running} onChange={e => { setDraft(e.target.value); setSample('custom') }} placeholder="Paste your draft ordinance here…" />
            <div className="editor-footer"><span>Invented examples · no legal validation</span><span>{draft.length.toLocaleString()} characters</span></div>
            <div className="population-heading"><div><span className="field-label">SIMULATED COMMUNITY</span><p>Same residents. Different perspectives.</p></div><Icon name="people" /></div>
            <div className="size-options" role="group" aria-label="Number of simulated residents">{[50, 100, 200].map(n => <button key={n} disabled={running} className={size === n ? 'chosen' : ''} aria-pressed={size === n} onClick={() => setSize(n)}><strong>{n}</strong><span>residents</span>{n === 50 && <small>Quick start</small>}</button>)}</div>
            <button className="primary-button" disabled={!draft.trim() || running} onClick={run}><Icon name="spark" size={18} />{running ? `Simulating · ${done}/${residents.length}` : 'Run simulation'}<Icon name="arrow" size={18} /></button>
            {running && <button className="stop-button" onClick={() => { cancelled.current = true; controller.current?.abort() }}>Stop simulation</button>}
            <p className="button-note"><Icon name="shield" size={13} /> Responses generated on your device via Ollama.</p>
            {error && <div className="error-message" role="alert">{error}</div>}
          </section>
          <section className="card community-card" id="community">
            <div className="card-heading"><span className="section-icon"><Icon name="people" /></span><div><h2>A community of perspectives</h2><p>Every person is a different simulated resident.</p></div><span className={`preview-badge ${mode === 'live' ? 'live' : ''}`}>{mode === 'preview' ? 'Sample preview' : running ? 'Running' : 'Local results'}</span></div>
            <div className="results-caption" role="status"><span>{mode === 'preview' ? 'Illustrative data · not generated from your draft' : `${completed.length} valid reactions · ${done - completed.length} unavailable`}</span><strong>{residents.length} residents</strong></div>
            {mode === 'live' && draft !== runDraft && <p className="draft-changed">Draft edited. Run again to update these results.</p>}
            <div className="stat-grid">{stances.map((s, i) => <button key={s} className={`stat ${s} ${filter === s ? 'selected-stat' : ''}`} onClick={() => setFilter(filter === s ? 'all' : s)} aria-pressed={filter === s}><span><i />{s}</span><strong>{percentages[i]}<small>%</small></strong><span>{counts[i]}</span></button>)}</div>
            <div className="stance-bar" aria-label="Distribution of simulated reactions">{stances.map((s, i) => <span key={s} className={s} style={{ flex: counts[i] || 0.001 }} />)}</div>
            {running && <progress aria-label="Simulation progress" max={residents.length} value={done} />}
            <div className="grid-toolbar"><h3>Resident map <span>{visible.length}</span></h3><div><select aria-label="Filter by occupation" value={job} onChange={e => setJob(e.target.value)}><option value="all">All occupations</option>{jobs.map(j => <option key={j}>{j}</option>)}</select><select aria-label="Filter by purok" value={purok} onChange={e => setPurok(e.target.value)}><option value="all">All puroks</option>{[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>Purok {n}</option>)}</select></div></div>
            <div className="map-stage">
              <div className="map-cluster-label">Grouped by purok</div>
              <div className="map-controls" aria-label="Map zoom controls"><button type="button" onClick={() => setMapZoom(zoom => Math.max(0.65, Number((zoom - 0.1).toFixed(2))))} disabled={mapZoom <= 0.65} aria-label="Zoom out">−</button><output aria-live="polite">{Math.round(mapZoom * 100)}%</output><button type="button" onClick={() => setMapZoom(zoom => Math.min(1.5, Number((zoom + 0.1).toFixed(2))))} disabled={mapZoom >= 1.5} aria-label="Zoom in">+</button><button type="button" className="reset-zoom" onClick={() => setMapZoom(1)}>Reset</button></div>
              <div className="map-viewport"><div className={`resident-map ${mapDensity}`} style={{ zoom: mapZoom }} aria-label="Clickable map of simulated residents">
                {person && <aside className="resident-profile floating-profile"><span className="profile-label">SELECTED RESPONDENT</span><span className="profile-avatar">{person.name.split(' ').slice(0, 2).map(s => s[0]).join('')}</span><div className="resident-name"><strong>{person.name}</strong><span className={`stance-pill ${reaction?.stance || ''}`}>{reaction?.stance || 'Awaiting response'}</span></div><p>{person.job}<br />{person.age} years old · Purok {person.purok}</p><div className="profile-divider" /><span className="profile-label">SIMULATED RESPONSE</span><blockquote>{reaction?.quote ? `“${reaction.quote}”` : reaction?.failed ? 'This response was unavailable.' : 'Their perspective will appear when the model responds.'}</blockquote>{reaction && !reaction.failed && <small>Impact {reaction.impact}/5 · {reaction.comply === 'comply' ? 'Would comply' : reaction.comply === 'partial' ? 'Would partly comply' : 'Would evade'}</small>}<span className="profile-hint">Click another resident to compare perspectives.</span></aside>}
                  {purokGroups.map(group => (
                    <section className="purok-tile" key={group.number} aria-label={`Purok ${group.number}, ${group.residents.length} simulated residents`}>
                      <h4>Purok {group.number}</h4>
                      <span className="purok-count">{group.residents.length} residents</span>
                      <span className="group-popover">Purok {group.number} · {group.residents.length} residents</span>
                      <div className="purok-residents">
                        {group.residents.map(r => (
                          <button key={r.id} className={`map-resident ${results[r.id]?.stance || 'pending'} ${selected === r.id ? 'selected-resident' : ''}`} aria-label={`${r.name}, ${r.job}, ${results[r.id]?.stance || 'no response'}. Select to read their response.`} aria-pressed={selected === r.id} title={`${r.name} · ${r.job} · Purok ${r.purok}`} onClick={() => setSelected(r.id)}>
                            <span className="map-person"><i className="person-head" /><i className="person-body" /></span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                  {!visible.length && <p className="empty-state">No residents match. Try another occupation or stance.</p>}
              </div></div>
              <div className="map-footer"><span><i className="pending-key" /> Pending / unavailable</span><button onClick={() => { setFilter('all'); setJob('all'); setPurok('all') }}>Reset filters</button></div>
            </div>
          </section>
        </div>
        {mode === 'live' && <section className="refine-section" id="insights"><div className="refine-heading"><div><div className="eyebrow">NEXT STEP</div><h2>Review, refine, and run again.</h2></div><span className="tiny-label">COMPARE RESULTS</span></div><div className="insight-grid"><article><span className="insight-number">01 / UNDERSTAND</span><h3>Look beyond the majority.</h3><p>Filter by occupation and purok to see who may face a greater burden.</p></article><article><span className="insight-number">02 / QUESTION</span><h3>Find missing details.</h3><p>Read individual reactions for concerns about access, cost, exceptions, and enforcement.</p></article><article><span className="insight-number">03 / REFINE</span><h3>Run a revision.</h3><p>{previous ? `Previous ${previous.count}-resident run: ${previous.percentages[0]}% support, ${previous.percentages[1]}% mixed, ${previous.percentages[2]}% oppose.` : 'Edit your draft, then run it again with the same community size to compare results.'}</p></article></div></section>}
        <footer className="page-footer"><span><Icon name="shield" size={16} /> Simulated reactions from a small local model, not a real survey.</span><span>Built for more thoughtful local policy.</span></footer>
      </div>
    </main>
  </div>
}
