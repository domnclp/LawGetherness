import { useState } from 'react'
import { chat } from './lib/ollama.js'
import { runPool } from './lib/pool.js'
import { generateCrowd } from './lib/personas.js'
import { crowdSchema } from './lib/schemas.js'
import { CROWD_SYSTEM, crowdUser } from './lib/prompts.js'

// Block 1 engine test: run 50 residents through the pool and log the results.
// Replaced by the real UI in Block 3.
const TEST_ORDINANCE = 'Tricycles are banned from operating on the national highway from 6:00 AM to 9:00 PM. Violators pay ₱1,000 for the first offense.'

export default function App() {
  const [status, setStatus] = useState('')

  async function run50() {
    const crowd = generateCrowd(50)
    const t0 = performance.now()
    let done = 0
    setStatus('Running 0/50...')
    try {
      const tasks = crowd.map(r => signal =>
        chat({ system: CROWD_SYSTEM, user: crowdUser(r, TEST_ORDINANCE), schema: crowdSchema, signal }))
      const results = await runPool(tasks, {
        concurrency: 2,
        onResult: (i, res) => {
          done++
          setStatus(`Running ${done}/50...`)
          console.log(i, crowd[i].job, res)
        }
      })
      const secs = ((performance.now() - t0) / 1000).toFixed(1)
      const split = { support: 0, mixed: 0, oppose: 0, gray: 0 }
      results.forEach(r => split[r ? r.stance : 'gray']++)
      console.log(`Done in ${secs}s`, split)
      setStatus(`Done in ${secs}s — ${JSON.stringify(split)} (details in console)`)
    } catch (err) {
      console.error(err)
      setStatus('Error: ' + err.message)
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>LawGetherness</h1>
      <button onClick={run50}>Run 50 (console)</button>
      <pre>{status}</pre>
    </main>
  )
}
