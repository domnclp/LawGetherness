// Thin wrapper around the local Ollama chat API (proxied by Vite at /ollama).
// Every call is local; nothing leaves the laptop.

// gemma3:4b chosen over qwen2.5:3b: far more natural Taglish (benchmarked 50 residents each).
export let MODEL = 'gemma3:4b'
export function setModel(m) { MODEL = m }

const NUM_CTX = 2048

// Qwen3 models reason out loud by default; turn that off so tokens go to the answer.
const noThink = model => (model.startsWith('qwen3') ? { think: false } : {})

// Turn fetch/HTTP failures into one clear message the UI can show.
async function post(body, signal) {
  let res
  try {
    res = await fetch('/ollama/api/chat', { method: 'POST', signal, body: JSON.stringify(body) })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new Error('Ollama not running. Start Ollama, then try again.')
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    // Vite's proxy answers 500/502 when nothing is listening on 11434.
    if (res.status >= 500 && /ECONNREFUSED|connect/i.test(text + res.statusText)) {
      throw new Error('Ollama not running. Start Ollama, then try again.')
    }
    throw new Error(`Ollama error ${res.status}: ${text.slice(0, 200)}`)
  }
  return res
}

// One structured call. Returns the parsed JSON object (throws SyntaxError on bad JSON).
export async function chat({ model = MODEL, system, user, schema, numPredict = 120, temperature = 0.7, signal }) {
  const res = await post({
    model, stream: false, format: schema, ...noThink(model),
    options: { temperature, num_predict: numPredict, num_ctx: NUM_CTX },
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
  }, signal)
  const data = await res.json()
  return JSON.parse(data.message.content)
}

// Streaming call for panel cards: onToken(fullTextSoFar) fires as text arrives.
// Returns the parsed JSON once the stream ends.
export async function chatStream({ model = MODEL, system, user, schema, numPredict = 500, temperature = 0.8, signal, onToken }) {
  const res = await post({
    model, stream: true, format: schema, ...noThink(model),
    options: { temperature, num_predict: numPredict, num_ctx: NUM_CTX },
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }]
  }, signal)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = '', full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()                  // keep the partial last line
    for (const line of lines) {
      if (!line.trim()) continue
      const chunk = JSON.parse(line)
      full += chunk.message?.content || ''
      onToken?.(full)
    }
  }
  return JSON.parse(full)
}

// Tiny call to load the model into VRAM before the demo starts.
export async function warmUp() {
  await post({ model: MODEL, stream: false, messages: [{ role: 'user', content: 'hi' }], options: { num_predict: 1, num_ctx: NUM_CTX } })
}
