// Runs async tasks with a concurrency limit (matches OLLAMA_NUM_PARALLEL=2).
// Each task is a function (signal) => Promise<result>.
// A failed task is retried once; on a second failure onResult(i, null) marks it gray.

export async function runPool(tasks, { concurrency = 2, onResult, signal } = {}) {
  const results = new Array(tasks.length).fill(null)
  let next = 0

  async function worker() {
    while (next < tasks.length) {
      if (signal?.aborted) return
      const i = next++
      let result = null
      for (let attempt = 0; attempt < 2 && result === null; attempt++) {
        try {
          result = await tasks[i](signal)
        } catch (err) {
          if (err.name === 'AbortError') return
          if (err.message?.startsWith('Ollama not running')) throw err  // no point retrying everything
          console.warn(`task ${i} attempt ${attempt + 1} failed:`, err.message)
        }
      }
      results[i] = result
      onResult?.(i, result)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}
