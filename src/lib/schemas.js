// JSON schemas for Ollama structured output (the `format` field).
// Property order matters: Ollama generates fields in schema order, so short
// fields come first and a long quote can never push them out of the token budget.
// `effect` comes first on purpose: the model states how the ordinance touches it
// before choosing a stance, which keeps stance/impact consistent with the persona.

// One call per ordinance: plain-language facts every resident reasons from,
// so a small model doesn't misread legal text 200 different ways.
export const briefSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    who_must_change: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    what_changes: { type: 'string' },
    // What people may still do that a careless reader might think is banned (judges found residents
    // reading the bag ban as a bag fee and the anti-reserving rule as a parking ban).
    still_allowed: { type: 'string' },
    // Everyday situations that make the law concrete. Each resident reacts to one of them; judging an
    // abstract title, most residents fell back on stock worries ("dagdag na trabaho sa negosyante").
    scenes: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    where_when: { type: 'string' },
    penalty: { type: 'string' },
    exemptions: { type: 'string' },
    // Legal and ethical check, so residents judge whether a rule is RIGHT, not only whether it touches them.
    targets_identity: { type: 'boolean' },
    rights_issues: { type: 'string' },
    penalty_check: { type: 'string' },
    public_benefit: { type: 'string' },
    legality: { enum: ['likely valid', 'questionable', 'likely unconstitutional'] },
    known_facts: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    // Ordinance-specific decision points a councilor must weigh. Code hands each affected resident
    // a different one, so 30 residents don't all repeat the same insight.
    issues: { type: 'array', items: { type: 'string' }, maxItems: 5 }
  },
  required: ['summary', 'who_must_change', 'what_changes', 'still_allowed', 'scenes', 'where_when', 'penalty', 'exemptions',
    'targets_identity', 'rights_issues', 'penalty_check', 'public_benefit', 'legality', 'known_facts', 'issues']
}

// `touches_me` is a categorical first step: does this ordinance reach my actual daily life?
export const crowdSchema = {
  type: 'object',
  properties: {
    touches_me: { enum: ['directly', 'indirectly', 'not really'] },
    // Ollama enforces maxLength by cutting the string (Taglish was chopped mid-word), so caps are
    // loose; the real word limits live in the prompt and tidyEnd() cleans any cut.
    effect: { type: 'string', maxLength: 130 },
    impact: { type: 'integer', minimum: 1, maximum: 5 },
    // Everyone weighs both sides before judging: who the rule helps and who it costs, in a few words
    // each. Without it, untouched residents judged from the title alone; a single free-text "why"
    // rambled past its cap and named no trade-off. Code joins them into the reasoning line (why).
    helps: { type: 'string', maxLength: 70 },
    hurts: { type: 'string', maxLength: 70 },
    // Moral/practical verdict before the stance: a small model follows a stance rule far better
    // once it has committed to a short judgment (same trick as touches_me).
    judgment: { enum: ['good rule', 'good rule but costly', 'unfair or harmful', 'pointless'] },
    stance: { enum: ['support', 'mixed', 'oppose'] },
    comply: { enum: ['comply', 'partial', 'evade'] },
    // One concrete, actionable point for the lawmaker (implementation problem, side effect,
    // needed exemption, missing definition, support measure). The quote is the human voice;
    // this is the part a councilor can act on.
    insight: { type: 'string', maxLength: 170 },
    // No quotation marks: the model "closed" its quote with ” and then padded ', , , ,' up to the cap
    // (about 30 wasted tokens a call). The pattern also bounds the length, and bans raw line breaks,
    // tabs and backslashes (a raw newline inside the string made the JSON invalid and cost a retry).
    quote: { type: 'string', pattern: '^[^"“”\\\\\\n\\r\\t]{1,140}$' }
  },
  required: ['touches_me', 'effect', 'impact', 'helps', 'hurts', 'judgment', 'stance', 'comply', 'insight', 'quote']
}

// Residents the ordinance doesn't touch skip the insight (their generic advice drowned out the affected
// residents' real points) and the effect line, which code writes for them: their free-text effect was
// where most misreads and invented stakes appeared. Saves about 55 output tokens each.
const { insight: _insight, effect: _effect, ...bystander } = crowdSchema.properties
export const crowdSchemaNoInsight = { type: 'object', properties: bystander, required: crowdSchema.required.filter(k => k !== 'insight' && k !== 'effect') }

// Same idea as the crowd: reason about life impact before picking a stance.
export const panelSchema = {
  type: 'object',
  properties: {
    life_impact: { type: 'string', maxLength: 300 },
    impact: { type: 'integer', minimum: 1, maximum: 5 },
    stance: { enum: ['support', 'mixed', 'oppose'] },
    comply: { enum: ['comply', 'partial', 'evade'] },
    reaction: { type: 'string', maxLength: 300 },
    loophole: { type: 'string', maxLength: 300 },
    what_would_help: { type: 'string', maxLength: 300 }
  },
  required: ['life_impact', 'impact', 'stance', 'comply', 'reaction', 'loophole', 'what_would_help']
}

// Togetherness summary: what the community actually thinks, in a few sentences. The mood label is
// chosen in code from the real split, so the model only writes the explanation.
export const summarySchema = {
  type: 'object',
  properties: { summary: { type: 'string', maxLength: 600 } },
  required: ['summary']
}

export const reportSchema = {
  type: 'object',
  properties: {
    // Scratchpad: the model reasons here before writing the visible fields; api.js strips it.
    analysis: { type: 'string', maxLength: 400 },
    headline: { type: 'string', maxLength: 200 },
    most_affected: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    top_loopholes: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    amendments: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          clause: { type: 'string' },
          change: { type: 'string' },
          reason: { type: 'string' }
        },
        required: ['clause', 'change', 'reason']
      }
    }
  },
  required: ['analysis', 'headline', 'most_affected', 'top_loopholes', 'amendments']
}
