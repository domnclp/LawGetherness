import { useEffect, useState } from 'react'
import App from './App.jsx'
import './site.css'

const isWelcome = () => !window.location.hash || window.location.hash === '#welcome'

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
  }, [welcome])

  if (!welcome) return <App />
  return <div className="landing-page">
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
    </main>
    <footer className="landing-footer">
      <div><span className="landing-coordinate">QUIAPO, MANILA · PHILIPPINES</span><p>Real communities inspire us.<br />Simulated perspectives help us explore.</p></div>
      <a className="landing-credit" href="https://unsplash.com/photos/people-walking-on-sidewalk-during-daytime-0GVF4AbdaHg" target="_blank" rel="noreferrer">Photograph by Kristine Wook / Unsplash ↗</a>
    </footer>
  </div>
}
