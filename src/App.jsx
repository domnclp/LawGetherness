import { useState } from 'react'

// Step 1 setup check: one structured-output call to local Ollama through the Vite proxy.
const testSchema = {
  type: 'object',
  properties: {
    stance: { enum: ['support', 'mixed', 'oppose'] },
    quote: { type: 'string' }
  },
  required: ['stance', 'quote']
}

export default function App() {
  const [out, setOut] = useState('')

  async function testOllama() {
    setOut('Calling qwen2.5:3b...')
    const t0 = performance.now()
    try {
      const res = await fetch('/ollama/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          model: 'qwen2.5:3b', stream: false, format: testSchema,
          options: { temperature: 0.8, num_predict: 80, num_ctx: 2048 },
          messages: [
            { role: 'system', content: 'You are Mang Rudy, a tricycle driver in a Philippine barangay. Answer only in the JSON schema. Quote is one Taglish sentence.' },
            { role: 'user', content: 'Ordinance: Tricycles are banned on the national highway from 6 AM to 9 PM.' }
          ]
        })
      })
      const data = await res.json()
      const parsed = JSON.parse(data.message.content)
      console.log('Ollama result:', parsed)
      setOut(JSON.stringify(parsed, null, 2) + `\n\n(${Math.round(performance.now() - t0)} ms)`)
    } catch (err) {
      console.error(err)
      setOut('Error: ' + err.message + '\nIs Ollama running and is qwen2.5:3b pulled?')
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>LawGetherness</h1>
      <button onClick={testOllama}>Test Ollama</button>
      <pre>{out}</pre>
    </main>
  )
}
