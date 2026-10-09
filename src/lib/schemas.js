// JSON schemas for Ollama structured output (the `format` field).
// Property order matters: Ollama generates fields in schema order, so short
// fields come first and a long quote can never push them out of the token budget.
// `effect` comes first on purpose: the model states how the ordinance touches it
// before choosing a stance, which keeps stance/impact consistent with the persona.

export const crowdSchema = {
  type: 'object',
  properties: {
    effect: { type: 'string', maxLength: 90 },
    impact: { type: 'integer', minimum: 1, maximum: 5 },
    stance: { enum: ['support', 'mixed', 'oppose'] },
    comply: { enum: ['comply', 'partial', 'evade'] },
    quote: { type: 'string', maxLength: 120 }
  },
  required: ['effect', 'impact', 'stance', 'comply', 'quote']
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
    loophole: { type: 'string', maxLength: 300 }
  },
  required: ['life_impact', 'impact', 'stance', 'comply', 'reaction', 'loophole']
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
