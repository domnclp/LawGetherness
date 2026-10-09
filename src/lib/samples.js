// Sample ordinances: 10 real Quezon City measures, written as plain-language summaries
// of what public sources document (official titles, city notices, Supreme Court text).
// They are NOT the full legal texts. Penalty amounts and details the sources don't
// state are left out on purpose rather than invented.

const NOTE = 'Simulation summary based on public sources, not the full legal text.'

export const SAMPLES = [
  {
    id: 'curfew',
    title: 'Minor curfew / "discipline hours" (SP-2301, S-2014)',
    source: 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/11/64912',
    text: `Quezon City Ordinance SP-2301, Series of 2014: Discipline Hours for Minors
${NOTE}

Section 1. "Discipline hours" are from 10:00 PM to 5:00 AM. A "minor" is any person below 18 years old.
Section 2. During discipline hours, minors may not roam, loiter, wander, stay, or meander in public places without a lawful purpose or justifiable reason.
Section 3. Exempted: minors accompanied by a parent or guardian; minors going to or from parties, graduation ceremonies, religious masses, and school or extracurricular activities where attendance is required; and minors who cannot get home early for reasons beyond their control, subject to verification by authorities.
Section 4. Parents or guardians who knowingly permit, or through insufficient control allow, a minor to stay in a public place during discipline hours shall be penalized, as provided in the full ordinance.
Note: The Supreme Court upheld this ordinance as constitutional in SPARK v. Quezon City.`
  },
  {
    id: 'plastic-bags',
    title: 'Plastic-bag distribution ban (SP-2868, S-2019)',
    source: 'https://quezoncity.gov.ph/public-notice/sp-2868-s-2019an-ordinance-further-amending-ordinance-no-sp-2140-s-2012/',
    text: `Quezon City Ordinance SP-2868, Series of 2019: Total Ban on Distribution of Plastic Bags
${NOTE}

Section 1. Distribution of plastic bags to customers is totally banned from the ordinance's effectivity.
Section 2. Covered sellers include shopping malls, supermarkets, department stores, grocery stores, fast-food chains, restaurants, drugstores and pharmacies, and, under a separate classification, market vendors and similar sellers.
Section 3. Brown (paper) bags are scheduled for a later phase of the ban. (This phase was deferred during the COVID-19 state of calamity by SP-3066, S-2021.)
Section 4. Certain retailers must submit annual reports, which are connected to their environmental clearance.
Section 5. The ordinance amends the city's Plastic Recovery System Fee and Green Fund rules (SP-2140, S-2012).`
  },
  {
    id: 'single-use',
    title: 'Single-use plastics & disposable cutlery in restaurants and hotels (SP-2876, S-2019)',
    source: 'https://quezoncity.gov.ph/wp-content/uploads/2020/11/SP-2876-S-2019.pdf',
    text: `Quezon City Ordinance SP-2876, Series of 2019: Prohibiting Single-Use Plastics and Disposable Materials in Restaurants and Hotels
${NOTE}

Section 1. Restaurants and hotels in Quezon City may not use or distribute single-use plastics and disposable materials, including disposable cutlery.
Section 2. Purpose: the city's waste study links disposable waste to clogged drainage, flooding, and disposal problems.
Section 3. Paper products and Styrofoam are not automatically treated as acceptable substitutes; the city does not consider them automatically better for the environment.
Section 4. Exact covered items, exceptions, and penalties are as provided in the full ordinance and its implementing rules.`
  },
  {
    id: 'smoking',
    title: 'Public smoking ban (NC-073, S-1989)',
    source: 'https://qccouncil.quezoncity.gov.ph/ordinances/3368',
    text: `Quezon City Ordinance NC-073, Series of 1989: Banning Smoking in Public Places
${NOTE}

Section 1. Smoking in public places in Quezon City is banned.
Section 2. Violators shall be penalized, as provided in the full ordinance.
Note: Later city ordinances and national tobacco-control laws also apply; which rule governs a specific place (designated smoking areas, boundaries) must be checked separately.`
  },
  {
    id: 'sogiesc',
    title: 'SOGIESC anti-discrimination policy (SP-3417, S-2025)',
    source: 'https://quezoncity.gov.ph/public-notices/ordinance/',
    text: `Quezon City Ordinance SP-3417, Series of 2025: Comprehensive Anti-Discrimination Policy on the Basis of SOGIESC
${NOTE}

Section 1. Quezon City adopts a comprehensive anti-discrimination policy on the basis of sexual orientation, gender identity and expression, and sex characteristics (SOGIESC).
Section 2. This revises the 2014 Quezon City Gender-Fair Ordinance (SP-2357, S-2014).
Section 3. The full ordinance defines the prohibited discriminatory acts, the covered settings and institutions, the complaint procedure, the office that handles complaints, and the sanctions.`
  },
  {
    id: 'school-zone',
    title: 'No smoking, vaping, or idling within 100 m of schools (SP-3449, S-2025)',
    source: 'https://quezoncity.gov.ph/public-notice-category/ordinance/22nd-city-council/',
    text: `Quezon City Ordinance SP-3449, Series of 2025: Banning Vapor Products, Smoking, and Idling Vehicles Within 100 Meters of School Zones
${NOTE}

Section 1. Within 100 meters of school zones, the following are banned: using vapor products (vapes), smoking, and leaving vehicles idling.
Section 2. Purpose: improve air quality around schools and protect children's health.
Section 3. How the 100-meter boundary is measured, what counts as idling, exceptions, enforcing agencies, and penalties are as provided in the full ordinance.`
  },
  {
    id: 'parking',
    title: 'No reserving curbside parking on residential two-way roads (SP-3423, S-2025)',
    source: 'https://quezoncity.gov.ph/public-notice/sp-3423-s-2025-an-ordinance-prohibiting-motor-vehicle-owners-from-reserving-a-parking-space-along-two-lane-two-way-roads-in-residential-areas-in-quezon-city/',
    text: `Quezon City Ordinance SP-3423, Series of 2025: Prohibiting the Reservation of Parking Spaces Along Two-Lane, Two-Way Roads in Residential Areas
${NOTE}

Section 1. Motor vehicle owners may not reserve a parking space along two-lane, two-way roads in residential areas of Quezon City.
Section 2. The curb is public road space; reserving it for one household is not allowed.
Section 3. Definitions of "reserving," enforcement authority, penalties, and exceptions are as provided in the full ordinance.`
  },
  {
    id: 'traffic-code',
    title: 'Revised Traffic Management Code (SP-2785, S-2018)',
    source: 'https://quezoncity.gov.ph/public-notice/an-ordinance-adopting-the-quezon-city-revised-traffic-management-code-of-2018/',
    text: `Quezon City Ordinance SP-2785, Series of 2018: Adopting the Quezon City Revised Traffic Management Code of 2018
${NOTE}

Section 1. Quezon City adopts a revised traffic management code covering traffic rules, road restrictions, traffic offenses, fees and penalties, and enforcement procedures in the city.
Section 2. It applies to motorists, public utility vehicles, delivery riders, cyclists, and pedestrians on city roads.
Section 3. Specific offenses, penalty amounts, and road restrictions are listed in the full code and its amendments.`
  },
  {
    id: 'enforcement',
    title: 'Fines and community service for ordinance violations (SP-2752, S-2019)',
    source: 'https://www.pna.gov.ph/articles/1063557',
    text: `Quezon City Ordinance SP-2752, Series of 2019: Procedures for Enforcing City Ordinance Violations
${NOTE}

Section 1. Barangay public safety officers, the Department of Public Order and Safety (DPOS), environmental protection officers, and the Quezon City Police District may enforce city ordinances under a common procedure.
Section 2. Covered violations include drinking liquor in public places, being half-naked in public places, violating minors' curfew hours, smoking in public places, and other city ordinance violations.
Section 3. Violators may face fines or community service, as provided in the full ordinance.`
  },
  {
    id: 'littering',
    title: 'Ban on spitting and littering in public places (Ord. 03453)',
    source: 'https://qccouncil.quezoncity.gov.ph/ordinances/10434',
    text: `Quezon City Ordinance 03453 (amending Section 2 of Ordinance No. 3162, Series of 1956): Prohibiting Spitting and Littering
${NOTE}

Section 1. Spitting, and littering paper and other rubbish, are prohibited in public buildings, streets, plazas, and other public places in Quezon City.
Section 2. Violators shall be penalized, as provided in the full ordinance.`
  }
]
