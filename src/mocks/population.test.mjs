import test from 'node:test'
import assert from 'node:assert/strict'
import { generateCrowd } from '../lib/personas.js'
import { crowdUser } from '../lib/prompts.js'

const tally = (people, key) => people.reduce((counts, p) => { counts[p[key]] = (counts[p[key]] || 0) + 1; return counts }, {})

test('full scenario matches all national approximate quotas', () => {
  const crowd = generateCrowd()
  assert.equal(crowd.length, 200)
  assert.equal(new Set(crowd.map(p => p.id)).size, 200)
  assert(crowd.every(p => p.age >= 18))
  assert.deepEqual(tally(crowd, 'employment'), { 'wage/salary':79, 'self-employed':33, 'unpaid family worker':6, employer:2, unemployed:8, 'not in the labor force':72 })
  assert.deepEqual(tally(crowd, 'group'), {
    farmer:21, fisherfolk:3, 'construction worker':12, 'factory worker':9,
    'vendor / store worker':22, 'government employee':12, driver:11,
    'food service worker':8, 'service worker':8, 'BPO / admin worker':7,
    'health worker / professional':7, unemployed:8, student:25,
    homemaker:27, 'senior / retiree':20
  })
  assert(crowd.filter(p => p.group === 'senior / retiree').every(p => p.age >= 60))
})

test('smaller runs are reproducible subsets and alternate seeds retain quotas', () => {
  assert.deepEqual(generateCrowd(50), generateCrowd().slice(0, 50))
  assert.deepEqual(generateCrowd(100), generateCrowd().slice(0, 100))
  assert.deepEqual(generateCrowd(), generateCrowd())
  assert.deepEqual(tally(generateCrowd(200, 123), 'group'), tally(generateCrowd(), 'group'))
})

test('employment context reaches the model without changing the ordinance', () => {
  const unpaid = generateCrowd().find(p => p.employment === 'unpaid family worker')
  const ordinance = 'SECTION 1. Market stalls close at 9 PM.'
  const prompt = crowdUser(unpaid, ordinance)
  assert(prompt.includes('(unpaid family worker)'))
  assert(prompt.includes(ordinance))
})
