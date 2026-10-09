function SummaryIcon({ name }) {
  const paths = {
    sentiment: 'M5 18 2 21V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5ZM6 7h12M6 11h8',
    benefit: 'M7 10v11H3V10h4Zm0 0 5-8c2 0 3 2 2 5l-1 3h6a2 2 0 0 1 2 2l-2 7a2 2 0 0 1-2 2H7',
    concern: 'M12 8v5m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    improvement: 'M9 18h6m-6 3h6M8 15a7 7 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3Z',
  }
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

// Optional response_summary fields can be supplied by the engine when available.
// Existing report fields populate the scaffold without a second inference call.
export default function ResponseSummary({ report, sentiment }) {
  const summary = report?.response_summary
  return <aside className="community-response-box" data-summary-slot="response-summary" aria-label="Togetherness summary">
    <h3 className="summary-heading"><SummaryIcon name="sentiment" />Togetherness summary</h3>
    <p>{summary?.sentiment || sentiment}</p>
    <div className="summary-highlights">
      <div className="summary-highlight summary-benefit"><span><SummaryIcon name="benefit" />Top benefit</span><p>{summary?.top_benefit || 'Awaiting benefit analysis'}</p></div>
      <div className="summary-highlight summary-concern"><span><SummaryIcon name="concern" />Top concern</span><p>{summary?.top_concern || report?.top_loopholes?.[0] || 'Awaiting concern analysis'}</p></div>
    </div>
    <div className="summary-improvement"><h3 className="summary-heading"><SummaryIcon name="improvement" />Suggested improvement</h3><p>{summary?.suggested_improvement || report?.amendments?.[0]?.change || 'Suggested changes will appear after the simulation report is ready.'}</p></div>
  </aside>
}
