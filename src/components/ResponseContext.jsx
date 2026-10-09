export default function ResponseContext({ mode, draft, runDraft, person, reaction }) {
  if (mode !== 'live') return null
  const stale = draft !== runDraft
  return <details className="response-context">
    <summary>{stale ? 'These responses belong to an earlier draft' : 'What are these responses based on?'}</summary>
    <p>{stale ? 'The ordinance has changed since this run. Run the simulation again before comparing responses with your current draft.' : 'The local model received this draft and each fictional resident’s profile. This shows the input used, not proof that the model interpreted every clause correctly.'}</p>
    {person && reaction?.effect && !reaction.error && <p><strong>Model’s stated effect on {person.name}:</strong> {reaction.effect}</p>}
    <h3>Draft used for this run</h3>
    <pre>{runDraft}</pre>
  </details>
}
