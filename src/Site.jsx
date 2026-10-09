import { useEffect, useState } from 'react'
import App from './App.jsx'
import './site.css'

const isWelcome = () => ['', '#welcome', '#about', '#how-it-works', '#local-ai', '#about-us'].includes(window.location.hash)

export default function Site() {
  const [welcome, setWelcome] = useState(isWelcome)
  useEffect(() => {
    const navigate = () => setWelcome(isWelcome())
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])
  useEffect(() => {
    document.title = welcome ? 'LawGetherness — Every law touches a life' : 'LawGetherness — Ordinance simulator'
    if (!welcome) document.getElementById('workspace')?.focus({ preventScroll: true })
    if (welcome && window.location.hash === '#about-us') requestAnimationFrame(() => document.getElementById('about-us')?.scrollIntoView())
  }, [welcome])

  if (!welcome) return <App />
  return <div className="landing-site"><div className="landing-page" id="welcome">
    <img className="landing-photo" src="/images/quiapo-manila.jpg" alt="People walking among market stalls in Quiapo, Manila" fetchPriority="high" />
    <div className="landing-shade" />
    <header className="landing-header">
      <a className="landing-brand" href="#welcome" aria-label="LawGetherness home">Law<span>Getherness</span><small>HEAR THE PEOPLE FIRST</small></a>
    </header>
    <main className="landing-main">
      <p className="landing-eyebrow">A LITTLE FORESIGHT. A BETTER TOMORROW.</p>
      <h1>Every law<br />touches a <em>life.</em></h1>
      <p className="landing-description">Test your draft through the eyes<br />of the community it could shape.</p>
      <a className="landing-cta" href="#workspace">Test a law <span aria-hidden="true">↗</span></a>
      <a className="landing-scroll" href="#how-it-works">Explore how the model works <span aria-hidden="true">↓</span></a>
    </main>
    <footer className="landing-footer">
      <div><span className="landing-coordinate">QUIAPO, MANILA · PHILIPPINES</span><p>Real communities inspire us.<br />Simulated perspectives help us explore.</p></div>
      <a className="landing-credit" href="https://unsplash.com/photos/people-walking-on-sidewalk-during-daytime-0GVF4AbdaHg" target="_blank" rel="noreferrer">Photograph by Kristine Wook / Unsplash ↗</a>
    </footer>
  </div>
    <section className="landing-intro landing-section" id="about" aria-labelledby="about-title">
      <p className="landing-kicker">MEET LAWGETHERNESS</p>
      <div className="landing-editorial-grid">
        <h2 id="about-title">Before a law takes effect,<br />make room for <em>perspective.</em></h2>
        <div className="landing-prose"><p>A change to a road, a market, or a quiet evening can affect people in very different ways. LawGetherness gives you a place to explore those possibilities before refining your draft.</p><p>Think of it as a wind tunnel for local ordinances: put a proposal through a simulated community, look for friction, and consider what could work better.</p><a className="landing-text-link" href="#how-it-works">From draft to a clearer picture <span aria-hidden="true">↓</span></a></div>
      </div>
    </section>
    <section className="landing-process landing-section" id="how-it-works" aria-labelledby="process-title">
      <div className="landing-photo-story">
      <img className="landing-story-photo" src="/images/DSCF0102.jpg" alt="Black-and-white photograph of people marching with public-policy protest signs" width="1920" height="1280" loading="lazy" decoding="async" />
      <div className="landing-story-content">
      <p className="landing-kicker">THE MODEL WORKS THROUGH…</p>
      <h2 id="process-title">Your draft. A few new perspectives.<br /><em>A more thoughtful next step.</em></h2>
      <ol className="landing-steps">
        <li><span className="landing-step-number">01 / DRAFT</span><h3>Start with an idea.</h3><p>Paste your ordinance or choose an example. Select a community of 50, 100, or 200 simulated residents.</p></li>
        <li><span className="landing-step-number">02 / SIMULATE</span><h3>See everyday impact.</h3><p>Run the local AI to generate reactions. Explore support, mixed views, and opposition, then click a resident on the map to read their perspective.</p></li>
        <li><span className="landing-step-number">03 / LISTEN</span><h3>Look a little deeper.</h3><p>A simulated panel explores effects on daily life and possible loopholes, adding context to the community reactions.</p></li>
        <li><span className="landing-step-number">04 / REFINE</span><h3>Give the draft another pass.</h3><p>Review the report’s affected groups, potential loopholes, and suggested amendments. Add a suggestion to your draft and run it again.</p></li>
      </ol>
      </div>
      </div>
      <div className="landing-photo-pair">
        <figure className="landing-documentary"><img src="/images/DSCF0279.jpg" alt="People gathered on a Manila street, with a central placard reading Para sa Bayan" width="1920" height="1280" loading="lazy" decoding="async" /><figcaption>Do it for the people who could be most affected.</figcaption></figure>
        <figure className="landing-documentary"><img src="/images/DSCF0312.jpg" alt="A demonstrator holding a handwritten sign about capitalism, corruption, and greed" width="1920" height="1280" loading="lazy" decoding="async" /><figcaption>Listen to what the people want.</figcaption></figure>
      </div>
    </section>
    <section className="landing-ai landing-section" id="local-ai" aria-labelledby="ai-title">
      <p className="landing-kicker">POWERED BY LOCAL AI</p>
      <div className="landing-editorial-grid">
        <h2 id="ai-title">A place to explore.<br /><em>Powered on your machine.</em></h2>
        <div className="landing-prose"><p>Explore how different people might react to your draft with AI that runs on your computer.</p><p>To get started, open Ollama with the gemma3:4b model installed. Ollama is the app that runs the AI. LawGetherness checks that it is ready before you begin. After setup, you can run simulations without an internet connection.</p><p className="landing-ai-note">The residents are fictional and their responses are created by AI. Use their views to spot possible problems and start conversations with your community. They do not replace a real survey or legal advice.</p></div>
      </div>
      <div className="landing-photo-story landing-closing-photo">
        <img className="landing-story-photo" src="/images/DSCF0313.jpg" alt="People standing beneath palm trees behind a large handwritten banner questioning public service and hardship" width="1920" height="1280" loading="lazy" decoding="async" />
        <div className="landing-story-content"><p>Better questions start<br />with a little <em>foresight.</em></p></div>
      </div>
      <div className="landing-closing"><a className="landing-cta" href="#workspace">Test a law <span aria-hidden="true">↗</span></a></div>
    </section>
    <section className="landing-about-us landing-section" id="about-us" aria-labelledby="about-us-title">
      <p className="landing-kicker">ABOUT US</p>
      <div className="landing-editorial-grid">
        <h2 id="about-us-title">Better decisions begin<br />with <em>more voices.</em></h2>
        <div className="landing-prose">
          <h3 className="landing-team-name">Choco Mallows</h3>
          <p>We’re the team behind LawGetherness, a local AI workspace for thinking through how an ordinance might affect everyday life.</p>
          <ul className="landing-team-members" aria-label="Choco Mallows team">
            <li><span>Zyrene Tapayan</span><a href="https://www.linkedin.com/in/zyrene-t-335068333" target="_blank" rel="noopener noreferrer" aria-label="Zyrene Tapayan on LinkedIn (opens in a new tab)">LinkedIn <span aria-hidden="true">↗</span></a></li>
            <li><span>Angel Dominic Lopez</span><a href="https://www.linkedin.com/in/angel-dominic-lopez-1499b5302/" target="_blank" rel="noopener noreferrer" aria-label="Angel Dominic Lopez on LinkedIn (opens in a new tab)">LinkedIn <span aria-hidden="true">↗</span></a></li>
          </ul>
          <a className="landing-text-link" href="#workspace">Test a law <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  </div>
}
