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
    where_when: { type: 'string' },
    penalty: { type: 'string' },
    exemptions: { type: 'string' },
    // Legal and ethical check, so residents judge whether a rule is RIGHT, not only whether it touches them.
    targets_identity: { type: 'boolean' },
    rights_issues: { type: 'string' },
    penalty_check: { type: 'string' },
    public_benefit: { type: 'string' },
    legality: { enum: ['likely valid', 'questionable', 'likely unconstitutional'] },
    known_facts: { type: 'array', items: { type: 'string' }, maxItems: 3 }
  },
  required: ['summary', 'who_must_change', 'what_changes', 'where_when', 'penalty', 'exemptions',
    'targets_identity', 'rights_issues', 'penalty_check', 'public_benefit', 'legality', 'known_facts']
}

// `touches_me` is a categorical first step: does this ordinance reach my actual daily life?
export const crowdSchema = {
  type: 'object',
  properties: {
    touches_me: { enum: ['directly', 'indirectly', 'not really'] },
    effect: { type: 'string', maxLength: 90 },
    impact: { type: 'integer', minimum: 1, maximum: 5 },
    // Moral/practical verdict before the stance: a small model follows a stance rule far better
    // once it has committed to a short judgment (same trick as touches_me).
    judgment: { enum: ['good rule', 'good rule but costly for me', 'unfair or harmful', 'pointless'] },
    stance: { enum: ['support', 'mixed', 'oppose'] },
    comply: { enum: ['comply', 'partial', 'evade'] },
    quote: { type: 'string', maxLength: 120 }
  },
  required: ['touches_me', 'effect', 'impact', 'judgment', 'stance', 'comply', 'quote']
}

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

export const reportSchema = {
  type: 'object',
  properties: {
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
  required: ['headline', 'most_affected', 'top_loopholes', 'amendments']
}
