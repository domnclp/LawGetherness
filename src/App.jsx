import { useEffect, useRef, useState } from 'react'

import { runCrowd, runPanel, runReport, checkOllama, PERSONAS_200, PANEL_PERSONAS, MODEL, SAMPLES, CROWD_MIX } from './lib/api.js'
import PanelCards from './components/PanelCards.jsx'
import Report from './components/Report.jsx'
import ResponseContext from './components/ResponseContext.jsx'
import SectorScenery from './components/SectorScenery.jsx'

const sectorNames = { farmer:'Agriculture', fisherfolk:'Fisheries', 'construction worker':'Construction', 'factory worker':'Manufacturing', 'vendor / store worker':'Trade & retail', 'government employee':'Government', driver:'Transport & delivery', 'food service worker':'Food service', 'service worker':'Other services', 'BPO / admin worker':'BPO & administration', 'health worker / professional':'Health & professional', unemployed:'Job seekers', student:'Students', homemaker:'Homemakers', 'senior / retiree':'Seniors & retirees' }
const displayPopulation = PERSONAS_200.map(person => ({ ...person, sector:sectorNames[person.group] || person.group, employmentType:['unemployed', 'not in the labor force'].includes(person.employment) ? null : person.employment, laborForceStatus:person.employment === 'unemployed' ? 'unemployed' : person.employment === 'not in the labor force' ? 'not in labor force' : 'employed' }))
const population = size => displayPopulation.slice(0, size)
const jobs = [...new Set(PERSONAS_200.map(person => person.job))]
const sectors = [...new Set(displayPopulation.map(person => person.sector))]

const exampleQuotes = ['Paano na ang pasada ko kung wala pang alternatibong ruta?', 'Mas maayos ang trapiko, pero sana may oras para makapag-adjust.', 'Sana may ligtas at abot-kayang sakay papunta sa school.', 'Makakatulong ito kung malinaw ang patakaran para sa lahat.']
const preview = Object.fromEntries(population(200).map(r => [r.id, { stance: r.id % 10 < 4 ? 'support' : r.id % 10 < 7 ? 'mixed' : 'oppose', impact: r.id % 5 + 1, comply: 'partial', quote: exampleQuotes[r.id % 10 < 4 ? 3 : r.id % 10 < 7 ? 1 : r.id % 2 === 0 ? 0 : 2] }]))
const stances = ['support', 'mixed', 'oppose']

function Icon({ name, size = 20 }) {
  const paths = { leaf: 'M19 3C8 2 3 7 5 14c2 7 12 5 14-11ZM5 20 15 8M8 15h5', grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', arrow: 'M5 12h14m-6-6 6 6-6 6', document: 'M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8M8 16h6', shield: 'M12 3 3 6v6c0 5 9 9 9 9s9-4 9-9V6l-9-3Zm-4 9 3 3 5-6', people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-4M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm7 0a4 4 0 0 1 0 8', spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z' }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.document} /></svg>
}
export default function App() {
  const [draft, setDraft] = useState(SAMPLES[0].text)
  const [sample, setSample] = useState(SAMPLES[0].id)
  const selectedSample = SAMPLES.find(item => item.id === sample)
  const [size, setSize] = useState(200)
  const [residents, setResidents] = useState(() => population(200))
  const [results, setResults] = useState(preview)
  const [mode, setMode] = useState('preview')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [job, setJob] = useState('all')
  const [sector, setSector] = useState('all')
  const [selected, setSelected] = useState(0)
  const [online, setOnline] = useState(navigator.onLine)
  const [previous, setPrevious] = useState(null)
  const [runDraft, setRunDraft] = useState('')
  const [mapZoom, setMapZoom] = useState(1)
  const [phase, setPhase] = useState('idle')
  const [health, setHealth] = useState('checking')
  const [panelResults, setPanelResults] = useState({})
  const [panelText, setPanelText] = useState({})
  const [report, setReport] = useState(null)
  const controller = useRef(null)
  const cancelled = useRef(false)
  useEffect(() => {
    let mounted = true
    checkOllama().then(ready => { if (mounted) setHealth(ready ? 'ready' : 'unavailable') }).catch(() => { if (mounted) setHealth('unavailable') })
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { mounted = false; window.removeEventListener('online', update); window.removeEventListener('offline', update); controller.current?.abort() }
  }, [])
  const completed = Object.values(results).filter(r => r && !r.error && stances.includes(r.stance))
  const counts = stances.map(s => completed.filter(r => r.stance === s).length)
  const percentages = counts.map(n => completed.length ? Math.round(n / completed.length * 100) : 0)
  const done = Object.keys(results).length
  const visible = residents.filter(r => (filter === 'all' || results[r.id]?.stance === filter) && (job === 'all' || r.job === job) && (sector === 'all' || r.sector === sector))
  const sectorGroups = sectors.map(name => ({ name, residents: visible.filter(resident => resident.sector === name) })).filter(group => group.residents.length)
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
    setPanelResults({}); setPanelText({}); setReport(null); setPhase('checking'); setHealth('checking')
    try {
      const ready = await checkOllama()
      if (abort.signal.aborted) return
      setHealth(ready ? 'ready' : 'unavailable')
      if (!ready) throw new Error(`Local AI is unavailable. Start Ollama with ${MODEL} installed, then try again.`)
      setPhase('crowd')
      const crowd = await runCrowd(draft, size, (_index, persona, result) => {
        if (!abort.signal.aborted) setResults(old => ({ ...old, [persona.id]: result }))
      }, abort.signal)
      if (abort.signal.aborted) return
      if (!crowd.some(result => result && !result.error && result.stance)) throw new Error('No resident responses were available. Please try again.')
      setPhase('panel')
      const panel = await runPanel(draft,
        (id, text) => { if (!abort.signal.aborted) setPanelText(old => ({ ...old, [id]: text })) },
        (id, result) => { if (!abort.signal.aborted) setPanelResults(old => ({ ...old, [id]: result })) },
        abort.signal)
      if (abort.signal.aborted) return
      setPhase('report')
      const summary = await runReport(draft, crowd, panel)
      if (!abort.signal.aborted) setReport(summary)
    } catch (err) {
      abort.abort()
      if (!cancelled.current) setError(err.message)
    } finally {
      if (cancelled.current) setError('Simulation stopped. Completed responses are kept below.')
      setRunning(false)
      setPhase('idle')
    }
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#welcome" aria-label="LawGetherness landing page" title="Back to welcome"><span className="brand-mark"><Icon name="leaf" size={27} /></span><span>LawGetherness<small>ORDINANCE WIND TUNNEL</small></span></a>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="rail-nav" aria-label="Workspace navigation"><a className="nav-item active" href="#workspace" aria-label="Draft ordinance" title="Draft ordinance"><Icon name="grid" /><span>Draft ordinance</span><small>01</small></a><a className="nav-item" href="#community" aria-label="Resident map" title="Resident map"><Icon name="people" /><span>Resident map</span></a><a className="nav-item" href="#insights" aria-label="Review and refine" title="Review and refine"><Icon name="spark" /><span>Review & refine</span></a></nav>
      <div className="rail-status" title="Local inference"><Icon name="shield" size={18} /><i className="status-dot" /></div>
    </aside>
    <main id="workspace" tabIndex={-1}>
      <header className="topbar workspace-header"><a className="workspace-wordmark" href="#welcome">Law<em>Getherness</em><small>ORDINANCE WIND TUNNEL</small></a><nav className="workspace-links" aria-label="Page sections"><a href="#draft">Draft a law</a><a href="#community">Community</a><a href="#insights">Review</a></nav><span className="connection"><i className={`status-dot ${online ? '' : 'offline'}`} />{online ? 'Internet connected' : 'Internet disconnected'}</span></header>
      <div className="page-content">
        <div className="page-heading"><div><h1>A draft. A community. A clearer picture.</h1><p>Explore how your ordinance could affect everyday life.</p></div><span className="private-tag"><Icon name="shield" size={16} /> Runs locally</span></div>
        <div className="workspace-grid">
          <section className="card draft-card" id="draft">
            <div className="card-heading"><div><span className="workspace-kicker">YOUR STARTING POINT</span><h2>A law worth thinking through.</h2><p>Bring your proposal. Explore its possibilities.</p></div></div>
            <label className="field-label" htmlFor="sample">START WITH AN EXAMPLE</label>
            <select id="sample" value={sample} disabled={running} onChange={e => { setSample(e.target.value); const nextSample = SAMPLES.find(item => item.id === e.target.value); if (nextSample) setDraft(nextSample.text) }}><option value="custom">Your own ordinance</option>{SAMPLES.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
            {selectedSample && <p className="sample-source"><a href={selectedSample.source} target="_blank" rel="noreferrer">View ordinance source ↗</a><span>Plain-language summary, not the full legal text.</span></p>}
            <div className="editor-heading"><label className="field-label" htmlFor="ordinance">ORDINANCE TEXT</label><span>Editable draft</span></div>
            <textarea id="ordinance" value={draft} disabled={running} onChange={e => { setDraft(e.target.value); setSample('custom') }} placeholder="Paste your draft ordinance here…" />
            <div className="editor-footer"><span>{selectedSample ? 'Source-based summary · no legal validation' : 'Your draft · no legal validation'}</span><span>{draft.length.toLocaleString()} characters</span></div>
            <div className="population-heading"><div><span className="field-label">COMMUNITY SIZE</span><p>Choose how many perspectives to explore.</p><details className="population-method"><summary>{CROWD_MIX.label}</summary><p>{CROWD_MIX.source} Smaller runs use subsets, not the full national mix.</p><p>{CROWD_MIX.groups.map(item => `${item.count} ${item.group}`).join(' · ')}</p><p>{Object.entries(CROWD_MIX.employment).map(([type, count]) => `${count} ${type}`).join(' · ')}</p></details></div></div>
            <div className="size-options" role="group" aria-label="Number of simulated residents">{[50, 100, 200].map(n => <button key={n} disabled={running} className={size === n ? 'chosen' : ''} aria-pressed={size === n} onClick={() => setSize(n)}><strong>{n}</strong><span>residents</span></button>)}</div>
            <button className="primary-button" disabled={!draft.trim() || running} onClick={run}><Icon name="spark" size={18} />{running ? phase === 'checking' ? 'Checking local AI…' : phase === 'panel' ? 'Listening to panel…' : phase === 'report' ? 'Preparing report…' : `Simulating · ${done}/${residents.length}` : 'Run simulation'}<Icon name="arrow" size={18} /></button>
            {running && phase !== 'report' && <button className="stop-button" onClick={() => { cancelled.current = true; controller.current?.abort() }}>Stop simulation</button>}
            <p className="button-note"><Icon name="shield" size={13} /> {health === 'ready' ? 'Local AI ready' : health === 'checking' ? 'Checking local AI…' : `Start Ollama with ${MODEL} to run` }</p>
            {error && <div className="error-message" role="alert">{error}</div>}
          </section>
          <section className="card community-card" id="community">
            <div className="card-heading"><div><h2>Community perspectives</h2></div><span className={`preview-badge ${mode === 'live' ? 'live' : ''}`}>{mode === 'preview' ? 'Sample preview' : running ? 'Running' : 'Local results'}</span></div>
            <div className="results-caption" role="status"><span>{mode === 'preview' ? 'Illustrative data · not generated from your draft' : `${completed.length} valid reactions · ${done - completed.length} unavailable`}</span><strong>{residents.length} residents</strong></div>
            {mode === 'live' && draft !== runDraft && <p className="draft-changed">Draft edited. Run again to update these results.</p>}
            <ResponseContext mode={mode} draft={draft} runDraft={runDraft} person={person} reaction={reaction} />
            <div className="stat-grid">{stances.map((s, i) => <button key={s} className={`stat ${s} ${filter === s ? 'selected-stat' : ''}`} onClick={() => setFilter(filter === s ? 'all' : s)} aria-pressed={filter === s}><span><i />{s}</span><strong>{percentages[i]}<small>%</small></strong><span>{counts[i]}</span></button>)}</div>
            <div className="stance-bar" aria-label="Distribution of simulated reactions">{stances.map((s, i) => <span key={s} className={s} style={{ flex: counts[i] || 0.001 }} />)}</div>
            {running && <progress aria-label="Simulation progress" max={residents.length} value={done} />}
            <div className="grid-toolbar"><h3>Resident map <span>{visible.length}</span></h3><div><select aria-label="Filter by occupation" value={job} onChange={e => setJob(e.target.value)}><option value="all">All occupations</option>{jobs.map(j => <option key={j}>{j}</option>)}</select><select aria-label="Filter by sector" value={sector} onChange={e => setSector(e.target.value)}><option value="all">All sectors</option>{sectors.map(name => <option key={name}>{name}</option>)}</select></div></div>
            <div className="map-stage">
              <div className="map-cluster-label">Sector village · national, approximate</div>
              <div className="map-controls" aria-label="Map zoom controls"><button type="button" onClick={() => setMapZoom(zoom => Math.max(0.65, Number((zoom - 0.1).toFixed(2))))} disabled={mapZoom <= 0.65} aria-label="Zoom out">−</button><output aria-live="polite">{Math.round(mapZoom * 100)}%</output><button type="button" onClick={() => setMapZoom(zoom => Math.min(1.5, Number((zoom + 0.1).toFixed(2))))} disabled={mapZoom >= 1.5} aria-label="Zoom in">+</button><button type="button" className="reset-zoom" onClick={() => setMapZoom(1)}>Reset</button></div>
              <div className="map-viewport"><div className={`resident-map sector-map ${mapDensity}`} style={{ zoom: mapZoom }} aria-label="Clickable 3D sector map of simulated residents">
                {person && <aside className="resident-profile floating-profile"><span className="profile-label">SELECTED RESPONDENT</span><span className="profile-avatar">{person.name.split(' ').slice(0, 2).map(s => s[0]).join('')}</span><div className="resident-name"><strong>{person.name}</strong><span className={`stance-pill ${reaction?.stance || ''}`}>{reaction?.stance || 'Awaiting response'}</span></div><p>{person.job}<br />{person.age} years old · {person.sector}<br />{person.laborForceStatus}{person.employmentType ? ` · ${person.employmentType}` : ''}</p><div className="profile-divider" /><span className="profile-label">SIMULATED RESPONSE</span><blockquote>{reaction?.quote ? `“${reaction.quote}”` : reaction?.error ? 'This response was unavailable.' : 'Their perspective will appear when the model responds.'}</blockquote>{reaction && !reaction.error && <small>Impact {reaction.impact}/5 · {reaction.comply === 'comply' ? 'Would comply' : reaction.comply === 'partial' ? 'Would partly comply' : 'Would evade'}</small>}<span className="profile-hint">Click another resident to compare perspectives.</span></aside>}
                  {sectorGroups.map(group => (
                    <section className="purok-tile sector-tile" key={group.name} data-sector={group.name} aria-label={`${group.name}, ${group.residents.length} simulated residents`}>
                      <SectorScenery sector={group.name} />
                      <h4>{group.name}</h4>
                      <span className="purok-count">{group.residents.length} residents</span>
                      <span className="group-popover">{group.name} · {group.residents.length} residents</span>
                      <div className="purok-residents">
                        {group.residents.map(r => (
                            <button key={r.id} className={`map-resident ${results[r.id]?.stance || 'pending'} ${selected === r.id ? 'selected-resident' : ''}`} aria-label={`${r.name}, ${r.job}, ${results[r.id]?.stance || 'no response'}. Select to read their response.`} aria-pressed={selected === r.id} title={`${r.name} · ${r.job} · ${r.sector}`} onClick={() => setSelected(r.id)}>
                            <span className="map-person"><i className="person-head" /><i className="person-body" /></span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                  {!visible.length && <p className="empty-state">No residents match. Try another occupation or stance.</p>}
              </div></div>
              <div className="map-footer"><span><i className="pending-key" /> Pending / unavailable</span><button onClick={() => { setFilter('all'); setJob('all'); setSector('all') }}>Reset filters</button></div>
            </div>
          </section>
        </div>
        {mode === 'live' && previous && <p className="draft-changed">Previous {previous.count}-resident run: {previous.percentages[0]}% support · {previous.percentages[1]}% mixed · {previous.percentages[2]}% oppose. Compare runs with the same community size.</p>}
        {mode === 'live' && (phase === 'panel' || phase === 'report' || Object.keys(panelResults).length > 0 || Object.keys(panelText).length > 0) && <PanelCards personas={PANEL_PERSONAS} results={panelResults} text={panelText} running={phase === 'panel'} />}
        {mode === 'live' && (report || phase === 'report') && <Report report={report} loading={phase === 'report'} stale={draft !== runDraft} disabled={running} onApply={amendment => { setDraft(current => `${current}\n\nPROPOSED AMENDMENT — ${amendment.clause}\n${amendment.change}`); setSample('custom'); document.getElementById('ordinance')?.focus() }} />}
        <footer className="page-footer"><span><Icon name="shield" size={16} /> Simulated reactions from a small local model, not a real survey.</span><span>Built for more thoughtful local policy.</span></footer>
      </div>
    </main>
  </div>
}
