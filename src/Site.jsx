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
      <a className="landing-brand" href="#welcome" aria-label="LawGetherness home">Law<span>Getherness</span><small>ORDINANCE WIND TUNNEL</small></a>
      <span className="landing-location">BUILT FOR OUR COMMUNITIES</span>
    </header>
    <main className="landing-main">
      <p className="landing-eyebrow">A LITTLE FORESIGHT. A BETTER TOMORROW.</p>
      <h1>Every law<br />touches a <em>life.</em></h1>
      <p className="landing-description">See your draft through the eyes<br />of the community it could shape.</p>
      <a className="landing-cta" href="#workspace">Test a law <span aria-hidden="true">↗</span></a>
      <a className="landing-scroll" href="#about">Discover how it works <span aria-hidden="true">↓</span></a>
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
      <p className="landing-kicker">HOW IT WORKS</p>
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
        <figure className="landing-documentary"><img src="/images/DSCF0279.jpg" alt="People gathered on a Manila street, with a central placard reading Para sa Bayan" width="1920" height="1280" loading="lazy" decoding="async" /><figcaption>Make space for the people a proposal could affect.</figcaption></figure>
        <figure className="landing-documentary"><img src="/images/DSCF0312.jpg" alt="A demonstrator holding a handwritten sign about capitalism, corruption, and greed" width="1920" height="1280" loading="lazy" decoding="async" /><figcaption>Listen for concerns. Ask better questions.</figcaption></figure>
      </div>
    </section>
    <section className="landing-ai landing-section" id="local-ai" aria-labelledby="ai-title">
      <p className="landing-kicker">POWERED BY LOCAL AI</p>
      <div className="landing-editorial-grid">
        <h2 id="ai-title">A place to explore.<br /><em>Powered on your machine.</em></h2>
        <div className="landing-prose"><p>The simulation uses Ollama to run a language model locally. Start Ollama with the project’s gemma3:4b model installed before running a simulation; the workspace checks whether it is ready.</p><p>Once the app and model are set up, inference can run without an internet connection. Your draft is processed by the configured local Ollama service.</p><p className="landing-ai-note">These are AI-generated perspectives from fictional residents, not real survey responses or legal validation. Use them to raise questions and support conversations with your actual community.</p></div>
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
        <div className="landing-prose"><p>LawGetherness is a local AI workspace for thinking through how an ordinance might affect everyday life.</p><p>This page is a starting point for our story, team, and community work. More about the people behind the project will be added here.</p><a className="landing-text-link" href="#workspace">Test a law <span aria-hidden="true">↗</span></a></div>
      </div>
    </section>
  </div>
}
