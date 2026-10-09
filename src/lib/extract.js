// Reads a draft ordinance from a file the user attaches: .txt/.md, .docx, or a text-based .pdf.
// Everything runs in the browser with built-in APIs (DecompressionStream); no upload, no new packages.

// The brief call reads the whole ordinance inside a 3072-token context next to its instructions,
// so very long files are cut to what the local model can actually read.
export const MAX_DRAFT_CHARS = 4500

// Tidies pasted or extracted text: line endings, stray spaces, page breaks, runs of blank lines.
export function cleanDraftText(text = '') {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Cleans and caps a draft. Returns { text, note } where note explains a cut ('' if none).
export function prepareDraft(text) {
  const clean = cleanDraftText(text)
  if (clean.length <= MAX_DRAFT_CHARS) return { text: clean, note: '' }
  // Cut at the last paragraph or sentence break before the limit.
  const head = clean.slice(0, MAX_DRAFT_CHARS)
  const cut = Math.max(head.lastIndexOf('\n'), head.lastIndexOf('. '))
  return {
    text: head.slice(0, cut > MAX_DRAFT_CHARS * 0.6 ? cut + 1 : MAX_DRAFT_CHARS).trim(),
    note: `Only the first ${MAX_DRAFT_CHARS.toLocaleString()} characters were loaded; the local model reads about that much. Trim the draft to the sections you want to test.`
  }
}

// file: a File from <input type="file">. Resolves to { text, note }; throws an Error with a
// message that can be shown to the user as-is.
export async function readOrdinanceFile(file) {
  const name = (file?.name || '').toLowerCase()
  let text
  if (/\.(txt|md|text)$/.test(name) || file.type.startsWith('text/')) text = await file.text()
  else if (name.endsWith('.docx')) text = await docxText(await file.arrayBuffer())
  else if (name.endsWith('.pdf')) text = await pdfText(await file.arrayBuffer())
  else throw new Error('Unsupported file. Attach a .txt, .md, .docx, or .pdf file, or paste the text.')
  if (!/[a-z]{3}/i.test(text || '')) throw new Error('No readable text was found in this file. Copy the ordinance text and use Paste instead.')
  return prepareDraft(text)
}

// ---------- .docx: a zip; the text lives in word/document.xml ----------

const inflate = (bytes, format) => new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format))).arrayBuffer()

// Exact stream bytes: DecompressionStream rejects the newline before "endstream" as junk, so use the
// dictionary's /Length when it is a plain number, otherwise trim the trailing end-of-line.
const streamData = (dict, s) => {
  const len = dict.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/)
  return len && +len[1] <= s.length ? s.slice(0, +len[1]) : s.replace(/\r?\n$/, '')
}
const inflatePdf = async (dict, s) => latin1(new Uint8Array(await inflate(Uint8Array.from(streamData(dict, s), c => c.charCodeAt(0)), 'deflate')))
const latin1 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192)); return s }

// Minimal zip reader: finds one entry through the central directory and returns its bytes.
async function zipEntry(buf, wanted) {
  const v = new DataView(buf), u8 = new Uint8Array(buf)
  let eocd = -1
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('This .docx file looks damaged. Copy the text and use Paste instead.')
  const count = v.getUint16(eocd + 10, true)
  let p = v.getUint32(eocd + 16, true)
  for (let n = 0; n < count && v.getUint32(p, true) === 0x02014b50; n++) {
    const method = v.getUint16(p + 10, true), size = v.getUint32(p + 20, true)
    const nameLen = v.getUint16(p + 28, true), extraLen = v.getUint16(p + 30, true), commentLen = v.getUint16(p + 32, true)
    const local = v.getUint32(p + 42, true)
    const entryName = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nameLen))
    if (entryName === wanted) {
      const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true)
      const data = u8.subarray(start, start + size)
      return method === 8 ? new Uint8Array(await inflate(data, 'deflate-raw')) : data
    }
    p += 46 + nameLen + extraLen + commentLen
  }
  throw new Error('No document text was found in this .docx file.')
}

async function docxText(buf) {
  const xml = new TextDecoder().decode(await zipEntry(buf, 'word/document.xml'))
  return decodeEntities(xml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, ''))
}

function decodeEntities(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
}

// ---------- .pdf: text from the page content streams ----------
// Handles the common case (PDFs exported from Word or a browser): Flate-compressed content streams
// with literal-string text operators. Scanned PDFs and some embedded-font encodings have no readable
// text layer; for those the user is asked to paste instead.

async function pdfText(buf) {
  const raw = latin1(new Uint8Array(buf))
  if (!raw.startsWith('%PDF')) throw new Error('This file is not a valid PDF.')
  const fonts = await fontMaps(raw)
  const out = []
  const re = /<<((?:[^<>]|<<(?:[^<>]|<<[^<>]*>>)*>>|<[^<>]*>)*)>>\s*stream\r?\n/g
  let m
  while ((m = re.exec(raw))) {
    const dict = m[1]
    if (/\/(Subtype\s*\/Image|Type\s*\/XObject|Type\s*\/ObjStm|Type\s*\/XRef|Length1|FontFile)/.test(dict)) continue
    const start = m.index + m[0].length
    const end = raw.indexOf('endstream', start)
    if (end < 0) break
    let body = raw.slice(start, end)
    if (/\/FlateDecode/.test(dict)) {
      try { body = await inflatePdf(dict, body) } catch { continue }
    } else if (/\/Filter/.test(dict)) continue
    if (/\bBT\b/.test(body)) out.push(textOperators(body, fonts))
    re.lastIndex = end
  }
  const text = out.join('\n')
  // Some PDFs place every word separately; when most lines are one or two words, rejoin them as prose.
  const lines = text.split('\n').filter(l => l.trim())
  const short = lines.filter(l => l.trim().split(/\s+/).length <= 2).length
  return lines.length > 20 && short / lines.length > 0.6 ? lines.join(' ').replace(/\s+/g, ' ').replace(/ (?=(Section|SECTION|Sec\.) \d)/g, '\n') : text
}

// Word and browser PDFs write text as glyph codes (<0037002C...> Tj); each font's ToUnicode CMap turns
// codes back into letters. Returns { fontResourceName: Map(code -> text) }.
async function fontMaps(raw) {
  const objs = new Map()
  for (const m of raw.matchAll(/(\d+)\s+0\s+obj\b([\s\S]*?)endobj/g)) objs.set(m[1], m[2])
  const streamOf = async body => {
    const i = body.search(/stream\r?\n/)
    if (i < 0) return ''
    const s = body.slice(body.indexOf('\n', i) + 1, body.lastIndexOf('endstream'))
    const dict = body.slice(0, i)
    if (!/\/FlateDecode/.test(dict)) return s
    try { return await inflatePdf(dict, s) } catch { return '' }
  }
  const cmapCache = new Map()
  const cmapOf = async num => {
    if (!cmapCache.has(num)) cmapCache.set(num, parseCMap(await streamOf(objs.get(num) || '')))
    return cmapCache.get(num)
  }
  const fonts = {}
  // Font resource dictionaries: /Font << /F4 12 0 R ... >> (inline) or /Font 15 0 R (indirect).
  const dicts = []
  for (const m of raw.matchAll(/\/Font\s*<<([^>]*)>>/g)) dicts.push(m[1])
  for (const m of raw.matchAll(/\/Font\s+(\d+)\s+0\s+R/g)) dicts.push(objs.get(m[1]) || '')
  for (const d of dicts) {
    for (const [, name, num] of d.matchAll(/\/([^\s/<>]+)\s+(\d+)\s+0\s+R/g)) {
      const cm = (objs.get(num) || '').match(/\/ToUnicode\s+(\d+)\s+0\s+R/)
      if (cm && !fonts[name]) fonts[name] = await cmapOf(cm[1])
    }
  }
  return fonts
}

// bfchar (<code> <text>) and bfrange (<lo> <hi> <start> or <lo> <hi> [<t1> <t2> ...]) entries.
function parseCMap(src) {
  const map = new Map()
  const uni = h => String.fromCodePoint(...(h.match(/.{4}/g) || []).map(x => parseInt(x, 16)))
  for (const block of src.match(/beginbfchar[\s\S]*?endbfchar/g) || []) {
    for (const [, c, u] of block.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) map.set(c.toLowerCase(), uni(u))
  }
  for (const block of src.match(/beginbfrange[\s\S]*?endbfrange/g) || []) {
    for (const [, lo, hi, rest] of block.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(\[[^\]]*\]|<[0-9a-fA-F]+>)/g)) {
      const a = parseInt(lo, 16), b = parseInt(hi, 16), w = lo.length
      const list = rest[0] === '[' ? [...rest.matchAll(/<([0-9a-fA-F]+)>/g)].map(x => x[1]) : null
      for (let c = a; c <= b && c - a < 5000; c++) {
        const key = c.toString(16).padStart(w, '0')
        if (list) { if (list[c - a]) map.set(key, uni(list[c - a])) }
        else map.set(key, String.fromCodePoint(parseInt(rest.slice(1, -1), 16) + (c - a)))
      }
    }
  }
  return map
}

function decodeHex(hex, cmap) {
  hex = hex.replace(/\s/g, '').toLowerCase()
  if (!cmap?.size) return hexString(hex)
  const w = [...cmap.keys()][0].length
  let s = ''
  for (let i = 0; i + w <= hex.length; i += w) s += cmap.get(hex.slice(i, i + w)) ?? ''
  return s
}

// Pulls strings out of BT ... ET blocks: (text) Tj, [(a) -250 (b)] TJ, ' and ". Line moves become newlines.
// Text is placed in chunks (words or single letters). A move with no vertical change (Td with ty 0,
// or Tm at the same y) continues the line; any vertical move starts a new one.
function textOperators(content, fonts = {}) {
  let text = '', line = '', font = null, lastY = null, join = false, lastChunk = ''
  const newLine = () => { if (line) text += line + '\n'; line = ''; join = false }
  const add = s => {
    if (!s) return
    // Letter-spaced headings ("T E C H") and split words ("W" + "earable") join without a space.
    if (join && line && !line.endsWith(' ')) line += lastChunk.trim().length === 1 || s.trim().length === 1 ? '' : ' '
    line += s; lastChunk = s; join = false
  }
  for (const block of content.match(/\bBT\b[\s\S]*?\bET\b/g) || []) {
    const tokens = block.match(/\((?:\\.|[^\\)])*\)|<[0-9a-fA-F\s]*>|\[|\]|-?\d*\.?\d+|\/[^\s/<>[\]()]+|[A-Za-z'"*]+/g) || []
    let inArray = false, lastName = null, nums = []
    for (const t of tokens) {
      if (t[0] === '/') lastName = t.slice(1)
      else if (t === '[') inArray = true
      else if (t === ']') inArray = false
      else if (t[0] === '(') add(pdfString(t.slice(1, -1)))
      else if (t[0] === '<') add(decodeHex(t.slice(1, -1), font))
      else if (/^-?\d*\.?\d+$/.test(t)) { if (inArray) { if (-parseFloat(t) > 200 && !line.endsWith(' ')) line += ' ' } else nums.push(+t) }
      else {
        if (t === 'Tf') font = fonts[lastName] || null
        else if (t === 'Td' || t === 'TD') { if (Math.abs(nums.at(-1) || 0) < 0.01) join = true; else newLine() }
        else if (t === 'Tm') { const y = nums.at(-1); if (lastY !== null && Math.abs(y - lastY) < 1) join = true; else newLine(); lastY = y }
        else if (/^(T\*|'|")$/.test(t)) newLine()
        nums = []
      }
    }
  }
  newLine()
  return text
}

function pdfString(s) {
  return s.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, e) => ({ n: '\n', r: '', t: ' ', b: '', f: '', '(': '(', ')': ')', '\\': '\\' }[e] ?? String.fromCharCode(parseInt(e, 8))))
}

// Hex strings are usually glyph IDs; keep them only when they decode to plain text.
function hexString(h) {
  const hex = h.replace(/\s/g, '')
  if (hex.length % 2) return ''
  const s = hex.match(/../g)?.map(x => String.fromCharCode(parseInt(x, 16))).join('') || ''
  return /^[\x20-\x7e]*$/.test(s) ? s : ''
}
