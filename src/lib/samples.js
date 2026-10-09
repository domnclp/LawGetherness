// Sample ordinances: 4 real Quezon City measures, written as plain-language summaries
// of what public sources document (official titles, city notices, Supreme Court text).
// They are NOT the full legal texts. Penalty amounts and details the sources don't
// state are left out on purpose rather than invented.

const NOTE = 'Simulation summary based on public sources, not the full legal text.'

// Only presets with a pre-computed saved run (public/runs/<id>.json) are listed; the hero comes first.
export const SAMPLES = [
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
  }
]
