const uniforms = {
  Fisheries: ['vest', 'cap'],
  Construction: ['safety', 'helmet'],
  Manufacturing: ['overalls', 'cap'],
  'Trade & retail': ['apron', 'hair'],
  Government: ['formal', 'hair'],
  'Transport & delivery': ['vest', 'helmet'],
  'Food service': ['apron', 'chef'],
  'Other services': ['polo', 'cap'],
  'BPO & administration': ['formal', 'headset'],
  'Health & professional': ['scrubs', 'hair'],
  'Job seekers': ['casual', 'hair'],
  Students: ['backpack', 'hair'],
  Homemakers: ['casual', 'hair'],
  'Seniors & retirees': ['cardigan', 'hair'],
}

// Clothing is decorative; gender is displayed only from persona data.
export default function ResidentFigure({ sector, id }) {
  const [outfit, accessory] = uniforms[sector] || ['casual', 'hair']
  const variant = Number(id) % 3
  const fabric = ['#64766a', '#9b8266', '#77758b'][variant]
  const skin = ['#c8916c', '#a97350', '#dfb18c'][variant]
  return <svg className="resident-figure" viewBox="0 0 30 46" aria-hidden="true">
    <ellipse cx="15" cy="43" rx="10" ry="2.5" fill="#36442f" opacity=".18" />
    <rect x="7" y="19" width="16" height="19" rx="5" fill="currentColor" />
    <path d="M20 21v12q0 3-3 4h5V24Z" fill="#000" opacity=".14" />
    {['apron', 'overalls', 'backpack'].includes(outfit) && <path d="M10 20v7h10v-7M10 26v11h10V26" fill={fabric} stroke={fabric} strokeWidth="2" />}
    {['formal', 'polo', 'casual', 'cardigan'].includes(outfit) && <>
      <path d="m10 20 5 5 5-5M15 25v10" fill="none" stroke="#f5eada" strokeWidth="1.5" />
      {outfit === 'formal' && <path d="m15 24-2 8 2 3 2-3Z" fill={fabric} />}
      {variant === 1 && <path d="M8 28h14m-14 4h14" stroke={fabric} strokeWidth="2" />}
      {outfit === 'cardigan' && <path d="M8 20h3v16H8m11-16h3v16h-3" fill={fabric} />}
    </>}
    {['safety', 'vest'].includes(outfit) && <path d="M10 21v15m10-15v15M8 30h14" stroke={outfit === 'safety' ? '#efe1a3' : fabric} strokeWidth="2.5" />}
    {outfit === 'scrubs' && <path d="m11 20 4 4 4-4m-1 9h4m-2-2v4" fill="none" stroke="#f6f3e9" strokeWidth="1.5" />}
    <circle cx="15" cy="12" r="7" fill={skin} />
    <path d="M9 10q0-8 8-6 6 1 5 8l-3-6-9 4Z" fill={variant === 2 && sector === 'Seniors & retirees' ? '#b8b9ae' : '#454139'} />
    {accessory === 'helmet' && <><path d="M7 10a8 8 0 0 1 16 0Z" fill="#d7bd70" /><path d="M5 10h20m-10-8v7" stroke="#9b8249" strokeWidth="2" /></>}
    {accessory === 'cap' && <path d="M8 9q0-8 13-4l1 4h-3l-12 2Z" fill={fabric} />}
    {accessory === 'chef' && <path d="M9 10V6Q3 1 11 1q4-3 8 0 8 0 2 6v3Z" fill="#f6f1e5" stroke="#bdb8a6" strokeWidth=".8" />}
    {accessory === 'headset' && <path d="M7 13V9a8 8 0 0 1 16 0v7l-5 2M7 12v4" fill="none" stroke="#424a47" strokeWidth="2" />}
    {sector === 'Seniors & retirees' && <path d="M9 12h5m2 0h5m-7 0h2" stroke="#565d54" strokeWidth="1.5" />}
  </svg>
}
