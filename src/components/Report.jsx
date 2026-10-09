export default function Report({ report, loading, stale, disabled, onApply }) {
  return <section id="insights" className="report-section" aria-labelledby="report-title" aria-busy={loading}>
    <div className="analysis-heading"><div><h2 id="report-title">Review your draft</h2><p>Suggested changes based on this simulation.</p></div></div>
    {loading ? <p role="status">Preparing the local report…</p> : <>
      {stale && <p className="draft-changed">The draft has changed. This report describes the previous version.</p>}
      <p className="report-headline">{report.headline}</p>
      <div className="report-columns"><div><h3>Most affected</h3><ul>{report.most_affected?.map((item, i) => <li key={i}>{item}</li>)}</ul></div><div><h3>Possible loopholes</h3><ul>{report.top_loopholes?.map((item, i) => <li key={i}>{item}</li>)}</ul></div></div>
      <h3>Suggested amendments</h3><div className="amendment-list">{report.amendments?.length ? report.amendments.map((item, i) => <article key={i}><h4>{item.clause}</h4><p>{item.change}</p><p className="amendment-reason">{item.reason}</p><button type="button" disabled={disabled || stale} onClick={() => onApply(item)}>Add to draft ↗</button></article>) : <p>No amendments were returned.</p>}</div>
    </>}
  </section>
}
