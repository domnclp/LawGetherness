// Thin wrapper around the local Ollama chat API (proxied by Vite at /ollama).
// Every call is local; nothing leaves the laptop.

// gemma3:4b chosen over qwen2.5:3b: far more natural Taglish (benchmarked 50 residents each).
export let MODEL = 'gemma3:4b'
export function setModel(m) { MODEL = m }

// 3072, not 2048: the report prompt (ordinance + legal check + crowd stats + panel) plus its output
// overflowed 2048. One size for every call so Ollama never reloads the model between calls.
const NUM_CTX = 3072

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
    // (Vite 8 answers 502 with an empty body; Ollama's own errors carry a JSON body.)
    if (res.status === 502 || res.status === 504 || (res.status >= 500 && !text.trim()) || /ECONNREFUSED|connect/i.test(text + res.statusText)) {
      throw new Error('Ollama not running. Start Ollama, then try again.')
    }
    throw new Error(`Ollama error ${res.status}: ${text.slice(0, 200)}`)
  }
  return res
}

// min_p drops very unlikely tokens: a 4B model at temperature 0.7 otherwise invents Tagalog words
// ("babandila", "nagpapatubig") and stray fragments; openers and angles still give variety.
const MIN_P = 0.1

// One structured call. Returns the parsed JSON object (throws SyntaxError on bad JSON).
// seed (optional): fixed per resident, so the same draft gives the same crowd and a before/after
// comparison shows the effect of the amendment, not sampling noise.
export async function chat({ model = MODEL, system, user, schema, numPredict = 120, temperature = 0.7, seed, signal }) {
  const res = await post({
    model, stream: false, format: schema, ...noThink(model),
    options: { temperature, min_p: MIN_P, num_predict: numPredict, num_ctx: NUM_CTX, ...(seed !== undefined && { seed }) },
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
    options: { temperature, min_p: MIN_P, num_predict: numPredict, num_ctx: NUM_CTX },
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
