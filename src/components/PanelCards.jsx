export default function PanelCards({ personas, results, text, running }) {
  return <section className="panel-section" aria-labelledby="panel-title">
    <div className="analysis-heading"><div><h2 id="panel-title">A closer look</h2><p>Seven fictional residents explore daily impact and enforcement gaps.</p></div><span role="status">{running ? `${Object.keys(results).length}/${personas.length} responses` : 'Panel responses'}</span></div>
    <div className="panel-grid">{personas.map(person => {
      const result = results[person.id]
      return <details key={person.id} className="panel-card">
        <summary><span className="panel-emoji" aria-hidden="true">{person.emoji}</span><span><strong>{person.name}</strong><small>{person.role}</small></span><span className="panel-state">{result?.error ? 'Unavailable' : result ? result.stance || 'Ready' : text[person.id] ? 'Writing…' : running ? 'Waiting' : 'Stopped'}</span></summary>
        <div className="panel-answer"><p className="panel-bio">{person.bio}</p>{result?.error ? <p>This response was unavailable.</p> : result ? <><h3>Reaction</h3><p>{result.reaction}</p><h3>Daily impact</h3><p>{result.life_impact}</p><h3>Possible gap</h3><p>{result.loophole}</p><small>Impact {result.impact}/5 · {result.comply}</small></> : <p className="streaming-text">{text[person.id] || 'A response will appear here when available.'}</p>}</div>
      </details>
    })}</div>
  </section>
}
