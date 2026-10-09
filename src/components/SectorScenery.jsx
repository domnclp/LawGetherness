const motifs = {
  Agriculture: 'M12 43V15m0 10L4 18m8 15 9-9M30 43V12m0 10-8-8m8 18 9-9',
  Fisheries: 'M3 35q10-8 20 0t20 0M8 25l9-9h15l8 9H8Zm15-9V4l12 12',
  Construction: 'M7 43V6h29M7 11h29L7 28m7 15V28h23v15M31 6v18m-4 0h8',
  Manufacturing: 'M4 43V21l12 7V17l12 8V8h9v35H4Zm7-8h3m7 0h3m7 0h3',
  'Trade & retail': 'M4 18h36L35 7H9L4 18Zm3 0v25h30V18M16 43V29h12v14M4 18q5 8 9 0 5 8 9 0 5 8 9 0 5 8 9 0',
  Government: 'M3 14 22 4l19 10H3Zm4 5v20m10-20v20m10-20v20m10-20v20M3 43h38',
  'Transport & delivery': 'M5 32V18h25v14H5Zm25-10h7l6 10H30M12 40a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm23 0a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  'Food service': 'M9 5v14q0 8 9 8V43m0-38v14M5 5v14m24 24V5q13 8 0 24',
  'Other services': 'm7 39 25-25m-9-8a10 10 0 0 0 14 14l-8 8M9 32a5 5 0 1 0 0 10 5 5 0 0 0 0-10',
  'BPO & administration': 'M5 7h34v25H5V7Zm17 25v9m-10 0h20M12 15h20m-20 7h12',
  'Health & professional': 'M4 43V9h36v34M18 16h8m-4-4v8M11 29h5m12 0h5M18 43V32h8v11',
  'Job seekers': 'M4 15h36v26H4V15Zm11 0V7h14v8M4 25q18 10 36 0m-20 3h4',
  Students: 'M22 12Q12 4 3 9v30q10-5 19 3 10-8 19-3V9q-9-5-19 3Zm0 0v30',
  Homemakers: 'M3 22 22 5l19 17M8 18v25h28V18M17 43V29h10v14',
  'Seniors & retirees': 'M6 27h32M8 32h28M10 21v6m23-6v6M11 32v11m22-11v11M12 14q10-12 20 0'
}

export default function SectorScenery({ sector }) {
  return <svg className="sector-scenery" viewBox="0 0 130 70" aria-hidden="true">
    <ellipse cx="65" cy="57" rx="43" ry="8" fill="currentColor" opacity=".12" />
    <path d="m22 47 43-22 43 22-43 22Z" fill="currentColor" opacity=".1" />
    <g transform="translate(43 4)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={motifs[sector] || motifs.Homemakers} /></g>
  </svg>
}
