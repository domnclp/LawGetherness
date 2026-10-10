# LawGetherness benchmarks

All numbers were measured on the demo laptop: ASUS TUF F17, i7-12700H, 16 GB RAM, **RTX 3060 Laptop (6 GB VRAM)**, Ollama with `gemma3:4b`, `OLLAMA_NUM_PARALLEL=2`, flash attention on, `num_ctx` 3072, 2 requests in flight. Everything ran offline.

> These are simulated reactions from a small local model, not a real survey. The benchmarks measure speed and whether the simulated residents reason consistently and accurately about the ordinance text, not whether they predict real public opinion.

## Speed

### Crowd, 24 residents, same personas and ordinances (engine v2 vs v3)

Engine v3 replaced the resident's free-text reasoning (which rambled to its length cap) with two short fields, *who gains* and *who loses*, and stopped the quote from padding junk characters. It also fixed a bug where the consistency check crashed on time-window ordinances (curfew), re-running or graying the resident.

| Ordinance | v2 wall time | v3 wall time | v2 tokens out per call | v3 tokens out per call | v2 failed (gray) | v3 failed (gray) |
| --- | --- | --- | --- | --- | --- | --- |
| School zone (no smoking/vaping/idling) | 94.0 s | 56.8-64.2 s | 188 | 139-147 | 1 | 0-1 |
| Curfew for minors | 100.6 s | 49.8-62.5 s | 193 | 148 | 1 | 0 |
| SOGIESC anti-discrimination | n/a | 44.2 s | n/a | 129 | n/a | 0 |
| Plastic bag ban | n/a | 61.4 s | n/a | 150 | n/a | 0 |

Per call, reading the prompt (about 1,700 tokens) takes about 0.35 s and writing the answer about 3 s, so output length drives speed. About 10% of residents are asked a second time when a consistency check fails.

### Full runs (200 residents)

| Preset (200 residents) | Total time (crowd + summary + panel + report) | Per resident | Split (support / mixed / oppose) | Failed (gray) |
| --- | --- | --- | --- | --- |
| School zone | 506 s (8.4 min) | 2.3 s | 131 / 69 / 0 | 0 |
| SOGIESC anti-discrimination | 408 s (6.8 min) | 1.9 s | 188 / 12 / 0 | 0 |
| Curfew for minors | 376 s (6.3 min) | 1.7 s | 140 / 60 / 0 | 0 |

A live 50-resident crowd takes about 1.5-2 minutes, plus about 1 minute for the summary, the 8-person panel and the report.

Saved runs for the 4 presets open instantly (crowd, togetherness summary, panel and report replay from `public/runs/`, about 2 s to animate the 200 dots), with Ollama stopped and Wi-Fi off.

## Reasoning and accuracy

### Guard tests (engine v3, run before freezing the saved runs)

| Test | Result |
| --- | --- |
| Unjust ordinance (bans public displays of LGBT identity, P5,000 fine + 6 months jail), 20 residents | **0 support / 0 mixed / 20 oppose**; reasons name the harm ("transgender woman faces fines and potential imprisonment") |
| SOGIESC anti-discrimination ordinance, 24 residents | 23 / 1 / 0; the mixed resident names a real cost (businesses facing complaints), and being stopped from refusing service is not counted as a cost |
| Curfew for minors, 24 residents | 14 / 10 / 0: parents of teens and night-shift workers weigh fines and freedom against safety |
| Unit checks on the consistency rules (contradiction finder, reconcile, quote cleanup, clustering) | 26 / 26 pass |
| Offline replay of saved presets with Ollama unreachable | crowd at 50/100/200 plus summary, panel, report and memo all served from `public/runs/` |

### What the residents' reasoning looks like (saved school-zone run)

- "Barangay officials protect children's health, but drivers face immediate penalties for idling vehicles."
- "The barangay protects children from harmful substances, but small vape shop owners lose income."
- "The barangay protects children from harmful smoke, but I lose a small pleasure and must walk further to smoke."

Across the 200 residents, the council memo clusters these into the trade-offs people named: *protects children's health* (157 residents) against *small business owners lose income* (27), *drivers face fines for minor idling* (21) and *delivery drivers face parking challenges* (19); 13 said no one really loses.

### Blind-judge rounds during development

Independent judge agents (no access to which version produced which answers) read 40 residents per ordinance and counted problems. Earlier engine versions, same method:

| Problem (share of residents) | First baseline | After consistency checks, relevance filtering and re-asks |
| --- | --- | --- |
| Misstates what the ordinance does | 38% | 12.5% |
| Invents life facts not in the profile | 21% | 4% |
| Incoherent text | 24% | 12.5% |
| Off topic | 10% | 5% |

Engine v3 then added the who-gains / who-loses weighing before every judgment (above). A small 4B model still makes mistakes; treat the output as a rehearsal for consultation, not a measurement of opinion.

