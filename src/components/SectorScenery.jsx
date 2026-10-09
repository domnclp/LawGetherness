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

const scenes = {
  'Health & professional': <>
    <rect x="24" y="18" width="34" height="38" rx="5" fill="#a2bdb1" /><rect x="30" y="11" width="22" height="9" rx="2" fill="#718e80" /><path d="M35 37h12m-6-6v12" stroke="#f3efe2" strokeWidth="4" />
    <g transform="translate(90 27) rotate(-20 20 10)"><rect width="42" height="19" rx="9" fill="#eee4ce" /><path d="M21 0h12a9 9 0 0 1 0 19H21Z" fill="#b98f7e" /></g>
    <rect x="170" y="15" width="48" height="42" rx="3" fill="#d9e3d1" stroke="#8da58f" /><path d="M180 15v42m28-42v42" stroke="#b1c4ad" />
    {[27, 44].map(y => <g key={y}><rect x="185" y={y} width="17" height="7" rx="3.5" fill="#a98b7b" /><path d={`M193 ${y}v7`} stroke="#f1e8d5" /></g>)}
    <rect x="245" y="30" width="31" height="27" rx="4" fill="#b6c6aa" /><path d="M250 23h21v8h-21Z" fill="#7e9680" /><path d="M252 43h16m-8-8v16" stroke="#f4efdf" strokeWidth="3" />
  </>,
  'BPO & administration': <>{[5, 65, 125, 185, 245].map((x, i) => <g key={x} transform={`translate(${x} ${[12, 1, 8, 1, 12][i]}) scale(.75 1)`}>
    <path d={`M0 0h52v${[45, 56, 49, 56, 45][i]}H0Z`} fill="#b7c1c9" /><path d={`m52 0 14 7v${[38, 49, 42, 49, 38][i]}H52Z`} fill="#83949f" />
    {[9, 21, 33].map(y => <path key={y} d={`M7 ${y}h9m6 0h9m6 0h9`} stroke="#e8e7cf" strokeWidth="5" />)}
    <path d={`M21 ${[34, 45, 38, 45, 34][i]}h12v11H21Z`} fill="#657c88" />
  </g>)}</>,
  'Food service': <>
    <rect x="16" y="29" width="268" height="28" rx="2" fill="#baa98e" /><path d="M12 27h276v5H12Z" fill="#e3d8c2" />
    <rect x="28" y="34" width="66" height="20" rx="2" fill="#6e7c70" /><path d="M35 39h52" stroke="#b4bfb1" strokeWidth="2" />
    <path d="M35 23h20m12 0h20" stroke="#6e7c70" strokeWidth="3" /><path d="M38 14h14v9H38m31-13h15v13H69" fill="#9daa9a" /><path d="M52 16h6v5h-6" stroke="#7b8e7d" fill="none" />
    <path d="M29 7h67L84 1H40Z" fill="#b6bcab" /><path d="M29 7v5h67V7" fill="#839381" />
    <rect x="123" y="34" width="60" height="22" fill="#d6c5a7" /><path d="M153 35v20m-23-14h9m28 0h9" stroke="#8b8f7a" strokeWidth="2" />
    <ellipse cx="217" cy="25" rx="20" ry="4" fill="#7e9689" /><path d="M219 24V13q0-9 9-9v8" stroke="#718b7d" strokeWidth="3" fill="none" />
    <path d="M252 22h19v5h-19Z" fill="#a2ad8e" /><path d="M256 22v-9m5 9V10m5 12v-8" stroke="#8d9476" strokeWidth="2" />
  </>,
  'Transport & delivery': <>
    <path d="M0 14h300v44H0Z" fill="#bbc1b2" /><path d="M0 21h300v29H0Z" fill="#859286" /><path d="M0 36h300" stroke="#ebe0bb" strokeWidth="2" strokeDasharray="18 14" /><path d="M0 20h300M0 51h300" stroke="#eee8d5" strokeWidth="2" />
    <path d="M37 15h38l10 12v13H28V27Z" fill="#afbd9b" /><path d="M41 18h29l6 10H35Z" fill="#648076" /><circle cx="39" cy="40" r="5" fill="#56675b" /><circle cx="73" cy="40" r="5" fill="#56675b" />
    <path d="M188 15h39v25h-39Z" fill="#c5ae8a" /><path d="M227 24h16l10 10v6h-26Z" fill="#96ac9d" /><path d="M232 27h9l6 7h-15Z" fill="#647c71" /><circle cx="199" cy="41" r="5" fill="#56675b" /><circle cx="242" cy="41" r="5" fill="#56675b" />
  </>,
  Homemakers: <>{[24, 122, 218].map((x, i) => <g key={x} transform={`translate(${x} 5)`}>
    <path d="M0 25 25 7l25 18v27H0Z" fill={i === 1 ? '#d6c8ae' : '#c4bfa9'} /><path d="m50 25 9-5v26l-9 6Z" fill="#a59d82" /><path d="M-5 25 25 2l30 23-5 4L25 9 0 29Z" fill="#9d8970" />
    <path d="M9 32h11v10H9m18-10h13v20H27" fill="#849785" />
  </g>)}</>,
  Students: <>
    <path d="M27 23h246v34H27Z" fill="#c9cbb7" /><path d="M120 13h60v44h-60Z" fill="#e2d6b9" /><path d="m112 14 38-13 38 13Z" fill="#859583" />
    <circle cx="150" cy="23" r="6" fill="#f1ead7" /><path d="M150 19v4h4" stroke="#718471" fill="none" /><path d="M139 39h22v18h-22Z" fill="#7d927e" />
    {[39, 63, 87, 190, 214, 238].map(x => <path key={x} d={`M${x} 30h13v9h-13m0 5h13v9h-13Z`} fill="#97b5a5" />)}
    <path d="M24 20h93m66 0h93" stroke="#9d8b70" strokeWidth="5" />
  </>,
  Construction: <>
    {[0, 1, 2].map(row => <g key={row}>{[0, 1, 2, 3].map(col => <path key={col} d={`M${20 + col * 18 + row % 2 * 7} ${51 - row * 10}h16v8h-16Z`} fill={row % 2 ? '#c5a58a' : '#b7957a'} stroke="#8c7864" strokeWidth=".6" />)}</g>)}
    <path d="m114 52 24-39h37l15 39Z" fill="#c4b794" /><path d="m133 22 23 5m-29 7 40 3" stroke="#e1d3b4" />
    {[0, 1, 2].map(i => <path key={i} d={`M210 ${49 - i * 9}h72v7h-72Z`} fill="#bfa078" stroke="#927a5d" />)}
    <path d="M190 12h85m-85 5h85" stroke="#879588" strokeWidth="3" />
  </>,
  Government: <>
    <path d="M142 9h16v43h-16Z" fill="#a99568" /><path d="M120 53h60v5h-60Z" fill="#8d805e" /><path d="M102 18h96" stroke="#8d805e" strokeWidth="4" /><circle cx="150" cy="12" r="5" fill="#cbbb8d" />
    {[103, 197].map(x => <g key={x}><path d={`m${x} 18-22 26h44Z`} fill="none" stroke="#a99568" strokeWidth="1.5" /><path d={`M${x - 24} 44h48q-5 14-24 14t-24-14Z`} fill="#b9ab7e" /><path d={`M${x - 18} 47h36`} stroke="#e2d7ae" strokeWidth="2" /></g>)}
  </>,
  'Seniors & retirees': <>{[35, 130, 225].map(x => <g key={x} transform={`translate(${x} 7)`}>
    <rect x="0" y="1" width="35" height="27" rx="5" fill="#b3ad8c" /><path d="M4 7h27m-27 8h27m-27 8h27" stroke="#ded5b8" strokeWidth="2" />
    <path d="M-3 31h41v8H-3Z" fill="#92896b" /><path d="M2 39v12m30-12v12M-5 21v18m43-18v18" stroke="#7d7f65" strokeWidth="3" />
  </g>)}</>,
}

const surfaces = {
  'Health & professional': ['#edf2e7', '#dce8d8', '#b2c9b8'],
  'BPO & administration': ['#edf0ed', '#d9e1df', '#a7b8b0'],
  'Food service': ['#f2eee2', '#e7ddc8', '#c2b391'],
  'Transport & delivery': ['#e9ede3', '#d4ddce', '#9cab97'],
  Construction: ['#f0ebdf', '#dfd6bd', '#b7a47e'],
  Students: ['#eeeae9', '#e0dce2', '#b5abbd'],
  Homemakers: ['#f0eee2', '#e3dec9', '#b9b390'],
  Government: ['#efeee2', '#dfdfcc', '#b5b593'],
  'Seniors & retirees': ['#f0eadb', '#e0d9c2', '#b5ad8d'],
}

function SectorLandscape({ sector }) {
  const [surface, middle, edge] = surfaces[sector]
  const urban = ['BPO & administration', 'Transport & delivery'].includes(sector)
  return <svg className="sector-landscape" viewBox="0 0 300 210" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 0h300v210H0Z" fill={surface} />
    {urban ? <>
      <path d="M0 155 300 145v65H0Z" fill={middle} />
      <path d="M0 180 300 170v40H0Z" fill={edge} opacity=".5" />
      <path d="M0 168 300 158M0 192 300 182" stroke={surface} strokeWidth="2" opacity=".7" />
    </> : <>
      <path d="M0 151Q65 137 150 154T300 148V210H0Z" fill={middle} />
      <path d="M0 183Q75 164 150 184T300 177V210H0Z" fill={edge} opacity=".6" />
      <path d="M0 196Q90 182 165 196T300 193" fill="none" stroke={surface} strokeWidth="2" opacity=".6" />
    </>}
    <g transform="translate(42 173) scale(.72 .55)" opacity=".72">{scenes[sector]}</g>
  </svg>
}

export default function SectorScenery({ sector }) {
  return <>{sector === 'Agriculture' && <svg className="agriculture-grass" viewBox="0 0 300 210" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 177Q70 160 150 180T300 172V210H0Z" fill="#c2d2a8" />
    <path d="M0 197Q85 181 155 197T300 189V210H0Z" fill="#a9be8d" />
    {[12, 40, 72, 110, 146, 184, 220, 256, 286].map((x, i) => <g key={x} transform={`translate(${x} ${195 + (i % 3) * 4})`}>
      <ellipse cx="1" cy="3" rx="10" ry="3" fill="#536f3d" opacity=".18" />
      <path d="M0 3Q-9-6-8-16Q0-10 0 3" fill="#71954e" />
      <path d="M0 3Q-3-11 3-23Q6-9 0 3" fill="#8eae64" />
      <path d="M0 3Q3-9 12-14Q9-3 0 3" fill="#5e8542" />
    </g>)}
  </svg>}{sector === 'Fisheries' && <svg className="sector-ground sector-water" viewBox="0 0 300 58" aria-hidden="true" preserveAspectRatio="none">
    <path d="M0 10Q25 0 50 10T100 10T150 10T200 10T250 10T300 10V58H0Z" fill="#b5d9d5" />
    <path d="M0 27Q25 17 50 27T100 27T150 27T200 27T250 27T300 27V58H0Z" fill="#8fbfbc" />
    <path d="M0 44Q25 34 50 44T100 44T150 44T200 44T250 44T300 44" fill="none" stroke="#e4f1e9" strokeWidth="2" />
    {[40, 130, 225].map((x, i) => <g key={x} transform={`translate(${x} ${25 + i % 2 * 9})`}>
      <path d="M0 0Q12-11 24 0Q12 11 0 0Zm24 0 8-6v12Z" fill={i === 1 ? '#e9dfb6' : '#537e7c'} />
      <circle cx="6" cy="-1" r="1.3" fill="#344e4c" />
      <path d="m13-6 5-4 2 7" fill="#6d9790" />
    </g>)}
  </svg>}{sector === 'Manufacturing' && <svg className="sector-ground sector-machinery" viewBox="0 0 300 62" aria-hidden="true" preserveAspectRatio="none">
    <path d="M0 51 300 44v18H0Z" fill="#c3baa8" />
    <g transform="translate(14 5)">
      <path d="M0 48V20l18 9V15l18 10V6h12v42Z" fill="#b5b8ac" stroke="#7d867c" strokeWidth="1" />
      <path d="m48 6 10 5v32l-10 5Z" fill="#7d897e" />
      <path d="M5 33h7v7H5m17-7h7v7h-7m17-7h5v7h-5" fill="#e9dfbb" />
      <path d="M35 6h14V2H35Z" fill="#68796d" />
    </g>
    <g transform="translate(106 9)">
      <path d="M0 39V10L35 0l35 10v29Z" fill="#b7c2b4" />
      <path d="M35 0 70 10v29H35Z" fill="#8d9f90" />
      <path d="M-3 10 35-2l38 12-4 3L35 3 1 13Z" fill="#6c8275" />
      <path d="M10 24h16v15H10m35-15h16v15H45" fill="#647b70" />
      <path d="M10 16h16m19 0h16" stroke="#ece7cb" strokeWidth="4" />
    </g>
    <g transform="translate(219 4)">
      <path d="M0 44V2h42v42Z" fill="#b0b9ac" /><path d="m42 2 13 7v35H42Z" fill="#7d8d80" />
      {[10, 23, 36].map(y => <path key={y} d={`M7 ${y}h8m8 0h10`} stroke="#e7deba" strokeWidth="5" />)}
    </g>
  </svg>}{sector === 'Job seekers' && <svg className="sector-ground sector-street" viewBox="0 0 300 58" aria-hidden="true" preserveAspectRatio="none">
    <path d="M0 13h300v45H0Z" fill="#cbcbbb" />
    <path d="M0 21h300v30H0Z" fill="#8b968c" />
    <path d="M0 21h300M0 51h300" stroke="#ece8d6" strokeWidth="3" />
    <path d="M0 36h300" stroke="#e5dcc0" strokeWidth="2" strokeDasharray="18 14" />
    <g fill="#f1ead5">{[0, 1, 2, 3].map(i => <rect key={i} x={136} y={24 + i * 7} width="27" height="4" />)}</g>
    {[28, 264].map(x => <g key={x} transform={`translate(${x} 1)`}><path d="M0 18V2h11" fill="none" stroke="#637969" strokeWidth="2" /><path d="M8 2h8v4H8Z" fill="#e7d6a5" /><ellipse cx="0" cy="18" rx="5" ry="2" fill="#586e5b" opacity=".2" /></g>)}
  </svg>}{sector === 'Trade & retail' && <svg className="sector-ground sector-shop" viewBox="0 0 300 64" aria-hidden="true" preserveAspectRatio="none">
    <path d="M0 55 300 49v15H0Z" fill="#cdb6a0" />
    <g transform="translate(18 4)">
      <path d="M0 13h126v43H0Z" fill="#eadbc3" /><path d="m126 13 12 6v31l-12 6Z" fill="#b59c85" />
      <rect x="7" y="25" width="71" height="26" rx="1" fill="#c4d9d0" stroke="#a78c70" />
      <rect x="89" y="24" width="26" height="32" fill="#70867a" /><path d="M110 40v5" stroke="#eadbc3" strokeWidth="2" />
      <path d="M-4 20 5 5h115l10 15Z" fill="#b4856f" />
      {[0, 1, 2, 3, 4, 5].map(i => <path key={i} d={`M${8 + i * 20} 5h10l5 15h-12Z`} fill="#eee4d2" />)}
      <path d="M17 28h51" stroke="#71867a" strokeWidth="2" />
      {[24, 48].map((x, i) => <path key={x} d={`m${x} 31-7 4 3 6 4-2v10h10V39l4 2 3-6-7-4-5 3Z`} fill={i ? '#9c899c' : '#b9896f'} />)}
    </g>
    <g transform="translate(198 12)">
      <path d="M0 43V8h72v35M-5 43h10m62 0h10" fill="none" stroke="#7c8776" strokeWidth="2" />
      {[9, 31, 53].map((x, i) => <g key={x}><path d={`m${x + 4} 8-4 5h10l-4-5`} fill="none" stroke="#7c8776" /><path d={`M${x} 14h10l3 22H${x - 3}Z`} fill={['#b99078', '#91a38c', '#aaa0b5'][i]} /><path d={`M${x + 5} 15v19`} stroke="#fff" opacity=".25" /></g>)}
    </g>
  </svg>}{scenes[sector] && <SectorLandscape sector={sector} />}{!scenes[sector] && !['Agriculture', 'Fisheries', 'Manufacturing', 'Job seekers', 'Trade & retail'].includes(sector) && <svg className="sector-ground" viewBox="0 0 300 34" aria-hidden="true" preserveAspectRatio="none">
    <path d="M0 12Q75 2 150 13T300 12V34H0Z" fill="currentColor" opacity=".08" />
    {[24, 136, 248].map(x => <g key={x} transform={`translate(${x} 1) scale(.55)`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity=".32"><path d={motifs[sector] || motifs.Homemakers} /></g>)}
  </svg>}<svg className="sector-scenery" viewBox="0 0 130 70" aria-hidden="true">
    <ellipse cx="65" cy="57" rx="43" ry="8" fill="currentColor" opacity=".12" />
    <path d="m22 47 43-22 43 22-43 22Z" fill="currentColor" opacity=".1" />
    <g transform="translate(43 4)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={motifs[sector] || motifs.Homemakers} /></g>
  </svg></>
}
