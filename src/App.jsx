import { useEffect, useRef, useState } from 'react'

import { runCrowd, runPanel, runReport, runSummary, getQuickSummary, getSummaryHighlights, getRunSource, prefetchBrief, readOrdinanceFile, prepareDraft, printCouncilMemo, percents, checkOllama, PERSONAS_200, PANEL_PERSONAS, MODEL, SAMPLES, CROWD_MIX, JOBS } from './lib/api.js'
import PanelCards from './components/PanelCards.jsx'
import Report from './components/Report.jsx'
import ResponseContext from './components/ResponseContext.jsx'
import ResponseSummary from './components/ResponseSummary.jsx'
import SectorScenery from './components/SectorScenery.jsx'
import ResidentFigure from './components/ResidentFigure.jsx'

const sectorNames = { farmer:'Agriculture', fisherfolk:'Fisheries', 'construction worker':'Construction', 'factory worker':'Manufacturing', 'vendor / store worker':'Trade & retail', 'government employee':'Government', driver:'Transport & delivery', 'food service worker':'Food service', 'service worker':'Other services', 'BPO / admin worker':'BPO & administration', 'health worker / professional':'Health & professional', unemployed:'Job seekers', student:'Students', homemaker:'Homemakers', 'senior / retiree':'Seniors & retirees' }
const displayPopulation = PERSONAS_200.map(person => ({ ...person, sector:sectorNames[person.group] || person.group, employmentType:['unemployed', 'not in the labor force'].includes(person.employment) ? null : person.employment, laborForceStatus:person.employment === 'unemployed' ? 'unemployed' : person.employment === 'not in the labor force' ? 'not in labor force' : 'employed' }))
const population = size => displayPopulation.slice(0, size)
const sectors = [...new Set(displayPopulation.map(person => person.sector))]

const exampleQuotes = ['Paano na ang pasada ko kung wala pang alternatibong ruta?', 'Mas maayos ang trapiko, pero sana may oras para makapag-adjust.', 'Sana may ligtas at abot-kayang sakay papunta sa school.', 'Makakatulong ito kung malinaw ang patakaran para sa lahat.']
const preview = Object.fromEntries(population(200).map(r => [r.id, { stance: r.id % 10 < 4 ? 'support' : r.id % 10 < 7 ? 'mixed' : 'oppose', impact: r.id % 5 + 1, comply: 'partial', quote: exampleQuotes[r.id % 10 < 4 ? 3 : r.id % 10 < 7 ? 1 : r.id % 2 === 0 ? 0 : 2] }]))
const stances = ['support', 'mixed', 'oppose']

function Icon({ name, size = 20 }) {
  const paths = { leaf: 'M19 3C8 2 3 7 5 14c2 7 12 5 14-11ZM5 20 15 8M8 15h5', grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', arrow: 'M5 12h14m-6-6 6 6-6 6', document: 'M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8M8 16h6', paperclip: 'm21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48', clipboard: 'M9 5h6m-7 0H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 3h6v4H9zM8 12h8M8 16h6', shield: 'M12 3 3 6v6c0 5 9 9 9 9s9-4 9-9V6l-9-3Zm-4 9 3 3 5-6', people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-4M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm7 0a4 4 0 0 1 0 8', spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z' }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.document} /></svg>
}
function FilterMenu({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const current = value === 'all' ? label : value
  return <div className="filter-menu">
    <button type="button" className="filter-menu-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(next => !next)}>{current}<span aria-hidden="true">⌄</span></button>
    {open && <div className="filter-menu-list" role="listbox" aria-label={label}>{['all', ...options].map(option => <button type="button" role="option" aria-selected={value === option} key={option} className={value === option ? 'chosen' : ''} onClick={() => { onChange(option); setOpen(false) }}>{option === 'all' ? label : option}</button>)}</div>}
  </div>
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
  const [previous, setPrevious] = useState(null)
  const [runDraft, setRunDraft] = useState('')
  const [mapZoom, setMapZoom] = useState(1)
  const [phase, setPhase] = useState('idle')
  const [health, setHealth] = useState('checking')
  // Offline badge (CLAUDE.md): network status from navigator.onLine; the model runs locally either way.
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false)
  const [panelResults, setPanelResults] = useState({})
  const [panelText, setPanelText] = useState({})
  const [report, setReport] = useState(null)
  const [togetherness, setTogetherness] = useState(null)
  const [highlights, setHighlights] = useState(null)   // { top_benefit, top_concern } for the summary card
  const [runSource, setRunSource] = useState(null)   // 'saved' | 'memory' | null (live), from lib/api.js getRunSource
  const fileInput = useRef(null)
  const controller = useRef(null)
  const cancelled = useRef(false)
  useEffect(() => {
    let mounted = true
    checkOllama().then(ready => { if (mounted) setHealth(ready ? 'ready' : 'unavailable') }).catch(() => { if (mounted) setHealth('unavailable') })
    return () => { mounted = false; controller.current?.abort() }
  }, [])
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false)
    window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  useEffect(() => {
    if (running) return
    const timer = setTimeout(() => prefetchBrief(draft), 800)
    return () => clearTimeout(timer)
  }, [draft, running])
  const completed = Object.values(results).filter(r => r && !r.error && stances.includes(r.stance))
  const counts = stances.map(s => completed.filter(r => r.stance === s).length)
  const percentages = percents(counts)   // whole numbers that add up to 100
  const done = Object.keys(results).length
  const visible = residents.filter(r => (filter === 'all' || results[r.id]?.stance === filter) && (job === 'all' || r.group === job) && (sector === 'all' || r.sector === sector))
  const sectorGroups = sectors.map(name => ({ name, residents: visible.filter(resident => resident.sector === name) }))
    .filter(group => group.residents.length)
    .sort((a, b) => b.residents.length - a.residents.length || sectors.indexOf(a.name) - sectors.indexOf(b.name))
  const mapDensity = residents.length >= 200 ? 'dense-map' : residents.length >= 100 ? 'compact-map' : ''
  const person = residents.find(r => r.id === selected)
  const reaction = results[selected]
  // Togetherness summary: what the simulated community actually thinks (lib/api.js runSummary).
  const responseSummary = togetherness?.summary || (mode === 'preview'
    ? 'Run a simulation to hear what the community thinks.'
    : running
      ? 'Listening to residents… the togetherness summary appears when the crowd finishes.'
      : 'The togetherness summary will appear when residents have responded.')
  async function run() {
    if (!draft.trim() || running) return
    if (mode === 'live' && completed.length) setPrevious({ percentages, count: residents.length })
    const people = population(size)
    setResidents(people); setResults({}); setMode('live'); setError(''); setRunning(true); setSelected(0); setFilter('all'); setRunDraft(draft); setMapZoom(size >= 200 ? 0.75 : size >= 100 ? 0.9 : 1)
    cancelled.current = false
    const abort = new AbortController(); controller.current = abort
    setPanelResults({}); setPanelText({}); setReport(null); setTogetherness(null); setHighlights(null); setRunSource(null); setPhase('checking'); setHealth('checking')
    try {
      const source = await getRunSource(draft, size)
      setRunSource(source)
      const ready = await checkOllama()
      if (abort.signal.aborted) return
      setHealth(ready ? 'ready' : 'unavailable')
      if (!ready && !source) throw new Error(`Local AI is unavailable. Start Ollama with ${MODEL} installed, then try again.`)
      setPhase('crowd')
      const crowd = await runCrowd(draft, size, (_index, persona, result) => {
        if (!abort.signal.aborted) setResults(old => ({ ...old, [persona.id]: result }))
      }, abort.signal)
      if (abort.signal.aborted) return
      if (!crowd.some(result => result && !result.error && result.stance)) throw new Error('No resident responses were available. Please try again.')
      setTogetherness(getQuickSummary(crowd))
      const together = await runSummary(draft, crowd, abort.signal)
      if (abort.signal.aborted) return
      setTogetherness(together)
      setHighlights(await getSummaryHighlights(draft, crowd))
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
  async function pasteDraft() {
    try {
      const { text, note } = prepareDraft(await navigator.clipboard.readText())
      if (text) { setDraft(text); setSample('custom'); setError(note) }
    } catch {
      setError('Clipboard access is unavailable. Paste directly into the draft box.')
    }
  }
  async function loadDraftFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const { text, note } = await readOrdinanceFile(file)
      setDraft(text); setSample('custom'); setError(note)
    } catch (err) {
      setError(err.message)
    }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#welcome" aria-label="LawGetherness landing page" title="Back to welcome"><span className="brand-mark"><Icon name="leaf" size={27} /></span><span>LawGetherness<small>ORDINANCE WIND TUNNEL</small></span></a>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="rail-nav" aria-label="Workspace navigation"><a className="nav-item" href="#welcome" aria-label="Home" title="Home"><Icon name="leaf" /><span>Home</span></a><a className="nav-item active" href="#workspace" aria-label="Test a law" title="Test a law"><Icon name="grid" /><span>Test a law</span><small>01</small></a><a className="nav-item" href="#about-us" aria-label="About us" title="About us"><Icon name="spark" /><span>About us</span></a></nav>
      <div className="rail-status" title={online ? 'Online. Inference runs locally.' : 'Offline. Inference still runs locally.'}><Icon name="shield" size={18} /><i className={online ? 'status-dot' : 'status-dot offline'} /></div>
    </aside>
    <main id="workspace" tabIndex={-1}>
      <header className="topbar workspace-header"><a className="workspace-wordmark" href="#welcome">Law<em>Getherness</em><small>ORDINANCE WIND TUNNEL</small></a><nav className="workspace-links" aria-label="Page sections"><a href="#welcome">Home</a><a href="#draft">Test a law</a><a href="#about-us">About us</a></nav><span className={online ? 'net-badge' : 'net-badge offline'} role="status" aria-live="polite" title="Network status from navigator.onLine. The AI model runs on this laptop either way." style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, fontSize: 12, whiteSpace: 'nowrap', border: `1px solid ${online ? '#6d967d' : '#c0614d'}`, background: online ? 'rgba(109,150,125,.16)' : 'rgba(192,97,77,.22)', color: online ? '#d7e8db' : '#f6cfc6' }}><i className={online ? 'status-dot' : 'status-dot offline'} style={online ? undefined : { background: '#e0735c' }} />{online ? 'Online' : 'Offline'} · {health === 'unavailable' ? 'local AI not running' : 'AI runs on this laptop'}</span></header>
      <div className="page-content">
        <div className="workspace-grid">
          <section className="card draft-card" id="draft">
            <div className="card-heading draft-introduction"><div><h1>Test a law.</h1></div></div>
            <div className="draft-layout">
              <div className="draft-controls">
                <div className="ordinance-picker">
                  <label className="field-label" htmlFor="sample">Ordinance</label>
                  <select id="sample" value={sample} disabled={running} onChange={e => { setSample(e.target.value); const nextSample = SAMPLES.find(item => item.id === e.target.value); if (nextSample) setDraft(nextSample.text) }}><option value="custom">Your own ordinance</option>{SAMPLES.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
                  {selectedSample && <p className="sample-source"><a href={selectedSample.source} target="_blank" rel="noreferrer" title="Plain-language summary, not the full legal text.">Source ↗</a></p>}
                </div>
              </div>
              <div className="draft-editor">
                <div className="editor-heading"><label className="field-label" htmlFor="ordinance">Draft</label><div className="draft-tools"><input ref={fileInput} className="visually-hidden" type="file" accept=".txt,.md,.text,.docx,.pdf" onChange={loadDraftFile} /><button type="button" className="draft-tool-button" aria-label="Add ordinance file" title="Add file" onClick={() => fileInput.current?.click()}><Icon name="paperclip" size={16} /></button><button type="button" className="draft-tool-button" aria-label="Paste ordinance text" title="Paste" onClick={pasteDraft}><Icon name="clipboard" size={16} /></button></div></div>
                <textarea id="ordinance" value={draft} disabled={running} onChange={e => { setDraft(e.target.value); setSample('custom') }} placeholder="Paste your draft ordinance here…" />
              </div>
              <div className="draft-below-controls">
                <div className="population-heading"><div className="population-title"><span className="field-label">Community size</span><button type="button" className="info-button" aria-label={`About this community mix: ${CROWD_MIX.label}`} data-tooltip={`${CROWD_MIX.label}. ${CROWD_MIX.source}`}>i</button></div></div>
                <div className="size-run-row"><div className="size-options" role="group" aria-label="Number of simulated residents">{[50, 100, 200].map(n => <button key={n} disabled={running} className={size === n ? 'chosen' : ''} aria-label={`${n} residents`} aria-pressed={size === n} onClick={() => setSize(n)}><strong>{n}</strong></button>)}</div><button className="primary-button compact-run" aria-label="Run simulation" disabled={!draft.trim() || running} onClick={run}>{running ? `${done}/${residents.length}` : 'Run simulation'}<Icon name="arrow" size={16} /></button></div>
                {running && phase !== 'report' && <button className="stop-button" onClick={() => { cancelled.current = true; controller.current?.abort() }}>Stop simulation</button>}
              </div>
            </div>
            {error && <div className="error-message" role="alert">{error}</div>}
          </section>
          <section className="card community-card" id="community">
            <div className="community-overview">
              <div className="community-perspective-panel">
                <div className="card-heading"><div><h2>Community perspectives</h2></div></div>
                <div className="stat-grid">{stances.map((s, i) => <button key={s} className={`stat ${s} ${filter === s ? 'selected-stat' : ''}`} onClick={() => setFilter(filter === s ? 'all' : s)} aria-pressed={filter === s}><span><i />{s}</span><strong>{percentages[i]}<small>%</small></strong><span>{counts[i]}</span></button>)}</div>
                <div className="stance-bar" aria-label="Distribution of simulated reactions">{stances.map((s, i) => <span key={s} className={s} style={{ flex: counts[i] || 0.001 }} />)}</div>
              </div>
              <ResponseSummary report={report ? { ...report, response_summary: highlights || undefined } : (highlights ? { response_summary: highlights } : null)} sentiment={togetherness?.mood ? `${togetherness.mood}. ${responseSummary}` : responseSummary} />
            </div>
            {mode === 'preview' && <div className="results-caption" role="status"><span>Preview: example colors and quotes, not results. Run a simulation to hear these residents.</span><strong>{residents.length} residents</strong></div>}
            {mode === 'live' && <div className="results-caption" role="status"><span>{`${completed.length} valid reactions · ${done - completed.length} unavailable`}{runSource === 'saved' ? ' · Saved run, computed earlier on this laptop' : runSource === 'memory' ? ' · Remembered from an earlier run of this draft' : ''}</span><strong>{residents.length} residents</strong></div>}
            {mode === 'live' && draft !== runDraft && <p className="draft-changed">Draft edited. Run again to update these results.</p>}
            <ResponseContext mode={mode} draft={draft} runDraft={runDraft} person={person} reaction={reaction} />
            {running && <progress aria-label="Simulation progress" max={residents.length} value={done} />}
            <div className="grid-toolbar"><h3>Resident map <span>{visible.length}</span></h3><div><FilterMenu label="All occupation groups" value={job} options={JOBS} onChange={setJob} /><FilterMenu label="All sectors" value={sector} options={sectors} onChange={setSector} /></div></div>
            <div className="map-stage">
              <div className="map-cluster-label" title={CROWD_MIX.source}>Sector village · {CROWD_MIX.label}</div>
              <p className="map-source-note">{CROWD_MIX.source}</p>
              <div className="map-controls" aria-label="Map zoom controls"><button type="button" onClick={() => setMapZoom(zoom => Math.max(0.65, Number((zoom - 0.1).toFixed(2))))} disabled={mapZoom <= 0.65} aria-label="Zoom out">−</button><output aria-live="polite">{Math.round(mapZoom * 100)}%</output><button type="button" onClick={() => setMapZoom(zoom => Math.min(1.5, Number((zoom + 0.1).toFixed(2))))} disabled={mapZoom >= 1.5} aria-label="Zoom in">+</button><button type="button" className="reset-zoom" onClick={() => setMapZoom(1)}>Reset</button></div>
              <div className="map-viewport"><h3 className="map-title">Residents here</h3><div className={`resident-map sector-map ${mapDensity}`} style={{ zoom: mapZoom }} aria-label="Clickable 3D sector map of simulated residents">
                {person && <aside className="resident-profile floating-profile"><span className="profile-label">SELECTED RESPONDENT</span><div className="profile-identity"><span className="profile-avatar">{person.name.split(' ').slice(0, 2).map(s => s[0]).join('')}</span><span className={`stance-pill ${reaction?.stance || ''}`}>{reaction?.stance || 'Awaiting response'}</span></div><div className="resident-name"><strong>{person.name}</strong></div><p>{person.job}<br />{person.age} years old · {person.sector}<br />Gender: {person.gender || 'Not specified'}<br />Employment: {person.employment}</p><div className="profile-divider" /><span className="profile-label">SIMULATED RESPONSE</span><blockquote>{reaction?.quote ? `“${reaction.quote}”` : reaction?.error ? 'This response was unavailable.' : 'Their perspective will appear when the model responds.'}</blockquote>{reaction && !reaction.error && <small>Impact {reaction.impact}/5 · {reaction.comply === 'comply' ? 'Would comply' : reaction.comply === 'partial' ? 'Would partly comply' : 'Would evade'}</small>}<span className="profile-hint">Click another resident to compare perspectives.</span></aside>}
                  {sectorGroups.map(group => (
                    <section className="purok-tile sector-tile" key={group.name} data-sector={group.name} aria-label={`${group.name}, ${group.residents.length} simulated residents`}>
                      <SectorScenery sector={group.name} />
                      <h4>{group.name}</h4>
                      <span className="purok-count">{group.residents.length} residents</span>
                      <span className="group-popover">{group.name} · {group.residents.length} residents</span>
                      <div className="purok-residents">
                        {group.residents.map(r => (
                            <button key={r.id} className={`map-resident ${results[r.id]?.stance || 'pending'} ${selected === r.id ? 'selected-resident' : ''}`} aria-label={`${r.name}, ${r.job}, ${results[r.id]?.stance || 'no response'}. Select to read their response.`} aria-pressed={selected === r.id} title={`${r.name} · ${r.job} · ${r.sector}`} onClick={() => setSelected(r.id)}>
                            <span className="map-person">{r.sector === 'Agriculture' ? <><i className="person-head" /><i className="person-body" /></> : <ResidentFigure sector={r.sector} id={r.id} />}</span>
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
        {mode === 'live' && (report || phase === 'report') && <Report report={report} loading={phase === 'report'} stale={draft !== runDraft} disabled={running} onExport={() => printCouncilMemo({ draft: runDraft, residents, results, report, togetherness, source: runSource })} onApply={amendment => { setDraft(current => `${current}\n\nPROPOSED AMENDMENT — ${amendment.clause}\n${amendment.change}`); setSample('custom'); document.getElementById('ordinance')?.focus() }} />}
        <footer className="page-footer"><span><Icon name="shield" size={16} /> Simulated reactions from a small local model, not a real survey.</span><span>Built for more thoughtful local policy.</span></footer>
      </div>
    </main>
  </div>
}
